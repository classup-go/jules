# LiveKit Session System - Complete Setup Guide

This guide explains how to set up and use the LiveKit real-time video conferencing system integrated into Jules Class Go.

## Overview

The LiveKit system provides:
- **Group sessions**: Live classroom sessions with multiple students
- **1-to-1 sessions**: Private tutoring sessions between teacher and student
- **Real-time video/audio**: High-quality video conferencing powered by LiveKit
- **Screen sharing**: Share screens during sessions
- **Chat**: In-session text chat
- **Recording**: Optional session recording
- **Session management**: Complete lifecycle (schedule → live → ended)

## Architecture

### Components

1. **Database Layer** (`supabase-livekit-setup.sql`)
   - `live_sessions` table: Session metadata and status
   - `session_participants` table: Track who joins/leaves
   - `session_chat_messages` table: Persistent chat history
   - Functions: start_session, end_session, cancel_session, join_session, leave_session
   - Views: upcoming_sessions, active_sessions

2. **API Layer**
   - `/api/livekit/token` - Generate LiveKit access tokens with proper permissions
   - `/api/sessions` - Create and list sessions
   - `/api/sessions/[id]` - Session CRUD operations (get, update, delete)
   - `/api/sessions/[id]/leave` - Handle disconnections

3. **UI Components**
   - `src/components/live/LiveRoom.tsx` - Main LiveKit room component
   - `src/app/(dashboard)/session/[id]/page.tsx` - Session lobby and viewer
   - `src/app/(dashboard)/teacher/sessions/page.tsx` - Teacher session management
   - `src/app/(dashboard)/teacher/sessions/new/page.tsx` - Create new sessions
   - `src/app/(dashboard)/student/sessions/page.tsx` - Student session list

## Installation Steps

### 1. Install Dependencies

```bash
pnpm add livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client
```

### 2. Set Up LiveKit Server

You have two options:

#### Option A: LiveKit Cloud (Recommended for production)

1. Sign up at [https://cloud.livekit.io](https://cloud.livekit.io)
2. Create a new project
3. Get your credentials:
   - API Key
   - API Secret
   - WebSocket URL

#### Option B: Self-hosted LiveKit (Development)

```bash
# Using Docker
docker run -d \
  --name livekit-server \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="APIkey: APIsecret" \
  livekit/livekit-server:latest \
  --dev

# Your credentials will be:
# API Key: APIkey
# API Secret: APIsecret
# WebSocket URL: ws://localhost:7880
```

### 3. Configure Environment Variables

Add to your `.env.local`:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
```

### 4. Run Database Migration

Execute the SQL setup file in your Supabase dashboard:

```bash
# In Supabase SQL Editor, run:
supabase-livekit-setup.sql
```

This creates:
- All necessary tables with proper constraints
- Row Level Security (RLS) policies
- Helper functions for session lifecycle
- Triggers for automatic livekit_room generation

### 5. Create Storage Buckets (Optional, for recordings)

In Supabase dashboard:

1. Go to Storage
2. Create bucket: `session-recordings`
3. Set to Private
4. Add RLS policies:

```sql
-- Allow teachers to upload recordings
CREATE POLICY "Teachers can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-recordings' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- Allow participants to download recordings
CREATE POLICY "Participants can view recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'session-recordings' AND
  EXISTS (
    SELECT 1 FROM session_participants sp
    JOIN live_sessions ls ON sp.session_id = ls.id
    WHERE sp.user_id = auth.uid()
    AND SPLIT_PART(name, '/', 2) = ls.id::text
  )
);
```

## Usage Guide

### For Teachers

#### 1. Create a Session

Navigate to `/teacher/sessions/new`:

1. Choose session type:
   - **Group session**: For entire classroom
   - **1-to-1 session**: For individual student

2. Select course (required)
3. If 1-to-1, select student
4. Enter title and description
5. Choose date and time
6. Set duration (30, 45, 60, 90, or 120 minutes)
7. Enable recording if needed
8. Set max participants (group sessions only)

#### 2. Manage Sessions

Navigate to `/teacher/sessions`:

- **View all sessions** with filters (all, upcoming, active, past)
- **Start scheduled sessions** - Changes status to 'live'
- **Join live sessions** - Enter the room
- **End sessions** - Marks as ended, kicks all participants
- **Cancel sessions** - Cancel before start
- **Delete sessions** - Remove scheduled/cancelled sessions

#### 3. During a Session

In the LiveKit room:
- **Video/Audio controls**: Toggle camera and microphone
- **Screen sharing**: Share your screen with students
- **Chat**: Send messages to all participants
- **Participant view**: See all connected students
- **Leave**: Exit the session gracefully

### For Students

#### 1. View Sessions

Navigate to `/student/sessions`:

- See all your enrolled sessions
- Filter by status (upcoming, active, past)
- View session details (teacher, course, date, duration)

#### 2. Join a Session

1. Click on a session card
2. Review session details in the lobby
3. Check technical prerequisites
4. Click "Rejoindre la session"
5. Grant camera/microphone permissions
6. Enter the room

#### 3. During a Session

- Participate with video/audio
- Use chat to communicate
- View shared screens
- Leave anytime

## API Reference

### POST /api/sessions

Create a new session.

**Request:**
```json
{
  "title": "Math Review - Chapter 3",
  "description": "Comprehensive review of algebra concepts",
  "sessionType": "group",
  "classroomId": "uuid",
  "scheduledAt": "2025-01-15T14:00:00Z",
  "duration": 60,
  "recordingEnabled": false,
  "maxParticipants": 50
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "title": "Math Review - Chapter 3",
    "status": "scheduled",
    "livekit_room": "session_uuid",
    ...
  },
  "message": "Session créée avec succès"
}
```

### GET /api/sessions

List sessions.

**Query params:**
- `type`: 'upcoming' | 'active' | 'past'
- `classroomId`: Filter by classroom

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Math Review",
      "session_type": "group",
      "status": "scheduled",
      "teacher": { ... },
      "classroom": { ... },
      ...
    }
  ]
}
```

### GET /api/sessions/[id]

Get session details with participants.

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "title": "Math Review",
    "teacher": { ... },
    "classroom": { ... },
    "participants": [
      {
        "user_id": "uuid",
        "joined_at": "2025-01-15T14:05:00Z",
        "left_at": null,
        "user": { ... }
      }
    ],
    ...
  }
}
```

### PATCH /api/sessions/[id]

Update session status.

**Request:**
```json
{
  "action": "start" | "end" | "cancel" | "update",
  "reason": "Optional cancellation reason"
}
```

**Actions:**
- `start`: Changes scheduled → live
- `end`: Changes live → ended
- `cancel`: Changes scheduled → cancelled
- `update`: Modify session fields

### POST /api/livekit/token

Generate LiveKit access token.

**Request:**
```json
{
  "sessionId": "uuid",
  "roomName": "session_uuid"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serverUrl": "wss://your-livekit-server.com",
  "roomName": "session_uuid",
  "participantName": "John Doe",
  "participantMetadata": {
    "role": "teacher",
    "avatar_url": "https://...",
    "is_teacher": true
  }
}
```

## Database Schema

### live_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| classroom_id | uuid | For group sessions (nullable) |
| teacher_id | uuid | Session creator |
| student_id | uuid | For 1-to-1 sessions (nullable) |
| title | text | Session title |
| description | text | Session description |
| session_type | text | 'group' or 'one_to_one' |
| scheduled_at | timestamptz | Start time |
| started_at | timestamptz | Actual start time |
| ended_at | timestamptz | End time |
| duration | integer | Duration in minutes |
| status | text | 'scheduled', 'live', 'ended', 'cancelled' |
| livekit_room | text | LiveKit room name (unique) |
| recording_enabled | boolean | Whether to record |
| recording_url | text | URL to recording |
| max_participants | integer | Participant limit |
| cancellation_reason | text | Why cancelled |

### session_participants

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | uuid | Foreign key to live_sessions |
| user_id | uuid | Participant |
| joined_at | timestamptz | Join time |
| left_at | timestamptz | Leave time (nullable) |
| device_type | text | Device info |
| user_agent | text | Browser info |
| connection_quality | text | Quality rating |

## Security

### Row Level Security (RLS)

All tables have RLS policies:

**live_sessions:**
- Teachers can manage their own sessions
- Students can view sessions they're enrolled in
- 1-to-1 students can view their dedicated sessions

**session_participants:**
- Users can view participants of their sessions
- Participants can view their own records

**session_chat_messages:**
- Only session participants can read messages
- Authenticated users can send messages to their sessions

### LiveKit Permissions

Token grants are role-based:

**Teachers:**
- `roomJoin`: true
- `roomAdmin`: true (full control)
- `roomRecord`: true (can record)
- `canPublish`: true
- `canPublishData`: true
- `canSubscribe`: true

**Students:**
- `roomJoin`: true
- `canPublish`: true
- `canPublishData`: true
- `canSubscribe`: true

## Troubleshooting

### Issue: "Configuration LiveKit manquante"

**Solution:** Ensure environment variables are set:
```bash
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=...
```

Restart your dev server after adding them.

### Issue: "Accès refusé à cette session"

**Solution:** Check that:
1. User is authenticated
2. User is enrolled in the classroom (for group sessions)
3. User is the designated student (for 1-to-1)
4. User is the teacher

### Issue: Camera/microphone not working

**Solution:**
1. Grant browser permissions
2. Use HTTPS (required for WebRTC)
3. Check device availability
4. Try a different browser (Chrome/Firefox recommended)

### Issue: Poor video quality

**Solution:**
1. Check internet connection speed
2. Reduce participant count
3. Disable video and use audio-only
4. Lower video resolution in LiveKit config

### Issue: Room not found

**Solution:**
1. Ensure session exists and status is 'live' or 'scheduled'
2. Check that `livekit_room` field is set
3. Verify LiveKit server is running
4. Check WebSocket URL is correct

## Performance Optimization

### Database Indexes

Already included in migration:
```sql
CREATE INDEX idx_sessions_teacher ON live_sessions(teacher_id);
CREATE INDEX idx_sessions_classroom ON live_sessions(classroom_id);
CREATE INDEX idx_sessions_status ON live_sessions(status);
CREATE INDEX idx_participants_session ON session_participants(session_id);
```

### Caching

Consider implementing:
1. Cache session lists on client
2. Use SWR for real-time updates
3. Implement optimistic UI updates

### Scaling

For large deployments:
1. Use LiveKit Cloud for auto-scaling
2. Implement session limits per teacher
3. Add rate limiting to API endpoints
4. Use Redis for token caching

## Next Steps

### Recommended Enhancements

1. **Notifications**: Send push notifications when sessions start
2. **Calendar integration**: Export sessions to Google Calendar
3. **Attendance tracking**: Automatic attendance based on participation
4. **Session analytics**: Duration stats, engagement metrics
5. **Breakout rooms**: Split group sessions into smaller groups
6. **Polls/Quiz**: Interactive elements during sessions
7. **Whiteboard**: Collaborative drawing tool
8. **Recording management**: Browse and share recordings
9. **Waiting room**: Hold participants before teacher joins
10. **Session templates**: Reusable session configurations

### Integration Ideas

- Link sessions to course lessons
- Auto-create sessions from course schedules
- Grade participation automatically
- Send follow-up assignments after sessions
- Generate session summaries with AI

## Support

For LiveKit documentation:
- [LiveKit Docs](https://docs.livekit.io/)
- [React Components](https://docs.livekit.io/reference/components/react/)
- [Server SDK](https://docs.livekit.io/server/sdks/node/)

For issues with this implementation:
- Check database RLS policies
- Review API logs for errors
- Test with LiveKit's example apps
- Verify WebSocket connectivity
