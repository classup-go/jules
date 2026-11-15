# LiveKit Setup Checklist

Use this checklist to ensure your LiveKit integration is properly set up.

## Prerequisites

- [ ] Jules Class Go platform is running
- [ ] Supabase project is configured
- [ ] Node.js and pnpm are installed

## Installation

### 1. Dependencies

- [ ] Install LiveKit packages:
  ```bash
  pnpm add livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client
  ```

### 2. LiveKit Server

Choose one option:

#### Option A: LiveKit Cloud (Recommended)
- [ ] Sign up at https://cloud.livekit.io
- [ ] Create a new project
- [ ] Copy API Key
- [ ] Copy API Secret
- [ ] Copy WebSocket URL

#### Option B: Self-hosted (Development)
- [ ] Run Docker container:
  ```bash
  docker run -d \
    --name livekit-server \
    -p 7880:7880 \
    -p 7881:7881 \
    -p 7882:7882/udp \
    -e LIVEKIT_KEYS="APIkey: APIsecret" \
    livekit/livekit-server:latest \
    --dev
  ```
- [ ] Verify server is running: http://localhost:7880

### 3. Environment Variables

- [ ] Create/update `.env.local`:
  ```env
  LIVEKIT_API_KEY=your_api_key_here
  LIVEKIT_API_SECRET=your_api_secret_here
  NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
  ```
- [ ] Restart Next.js dev server

### 4. Database Migration

- [ ] Open Supabase SQL Editor
- [ ] Run `supabase-livekit-setup.sql`
- [ ] Verify tables created:
  - [ ] `live_sessions`
  - [ ] `session_participants`
  - [ ] `session_chat_messages`
- [ ] Verify functions created:
  - [ ] `start_session()`
  - [ ] `end_session()`
  - [ ] `cancel_session()`
  - [ ] `join_session()`
  - [ ] `leave_session()`
- [ ] Verify views created:
  - [ ] `upcoming_sessions`
  - [ ] `active_sessions`

### 5. Storage (Optional)

- [ ] Create `session-recordings` bucket in Supabase Storage
- [ ] Set bucket to Private
- [ ] Add RLS policies for recordings (see guide)

## Verification

### Test Teacher Flow

- [ ] Login as teacher
- [ ] Navigate to `/teacher/sessions`
- [ ] Page loads without errors
- [ ] Click "Nouvelle Session"
- [ ] Create a test group session:
  - [ ] Select course
  - [ ] Enter title
  - [ ] Select date/time
  - [ ] Submit form
- [ ] Session appears in list
- [ ] Click "Démarrer" on session
- [ ] Session status changes to "live"
- [ ] Click "Rejoindre"
- [ ] LiveKit room loads
- [ ] Camera/microphone permissions requested
- [ ] Video appears in room
- [ ] Controls work (mute, video toggle, chat, screen share)
- [ ] Leave room successfully
- [ ] Click "Terminer" on session
- [ ] Session status changes to "ended"

### Test Student Flow

- [ ] Login as student
- [ ] Navigate to `/student/sessions`
- [ ] Page loads without errors
- [ ] Test session appears (if enrolled in course)
- [ ] Create live session as teacher
- [ ] Student sees "En direct" badge
- [ ] Click "Rejoindre maintenant"
- [ ] Session lobby loads
- [ ] Click "Rejoindre la session"
- [ ] LiveKit room loads
- [ ] Student can see/hear teacher
- [ ] Student video/audio works
- [ ] Chat works
- [ ] Leave successfully

### Test 1-to-1 Flow

- [ ] Login as teacher
- [ ] Create 1-to-1 session:
  - [ ] Select course
  - [ ] Select student
  - [ ] Set date/time
  - [ ] Submit
- [ ] Login as selected student
- [ ] Session appears in student's session list
- [ ] Start session as teacher
- [ ] Student joins successfully
- [ ] Private session works correctly

## Troubleshooting

If tests fail, check:

- [ ] Browser console for errors
- [ ] Network tab for failed requests
- [ ] Supabase logs for database errors
- [ ] LiveKit server logs (if self-hosted)
- [ ] Environment variables are loaded
- [ ] All SQL migrations ran successfully
- [ ] RLS policies are correct
- [ ] User has proper role (teacher/student)
- [ ] Student is enrolled in course
- [ ] HTTPS is enabled (required for WebRTC)

## Common Issues

### "Configuration LiveKit manquante"
- **Cause**: Missing environment variables
- **Fix**: Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL
- **Action**: [ ] Fixed

### Camera/microphone not working
- **Cause**: Browser permissions denied
- **Fix**: Grant permissions in browser settings
- **Action**: [ ] Fixed

### "Accès refusé"
- **Cause**: User not enrolled or wrong permissions
- **Fix**: Verify enrollment and RLS policies
- **Action**: [ ] Fixed

### Room not loading
- **Cause**: LiveKit server not running or wrong URL
- **Fix**: Check server status and NEXT_PUBLIC_LIVEKIT_URL
- **Action**: [ ] Fixed

## Production Readiness

Before deploying to production:

- [ ] Use LiveKit Cloud (not self-hosted)
- [ ] Use wss:// (secure WebSocket) for LIVEKIT_URL
- [ ] Set up proper domain with SSL certificate
- [ ] Configure CORS for LiveKit server
- [ ] Set reasonable max_participants limits
- [ ] Test with multiple users simultaneously
- [ ] Monitor LiveKit usage and costs
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure recording storage limits
- [ ] Add rate limiting to API endpoints
- [ ] Test network conditions (slow, unstable)
- [ ] Verify mobile browser compatibility
- [ ] Set up backup recording storage
- [ ] Document SLA and support procedures

## Next Steps

After basic setup works:

- [ ] Implement notifications for session starts
- [ ] Add calendar integration
- [ ] Track attendance automatically
- [ ] Add session analytics dashboard
- [ ] Implement breakout rooms
- [ ] Add polls/quizzes during sessions
- [ ] Integrate whiteboard tool
- [ ] Add recording management UI
- [ ] Implement waiting room
- [ ] Create session templates

## Completion

- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Team trained on features
- [ ] Support process established
- [ ] Monitoring configured
- [ ] Ready for production

---

**Date Completed**: _______________

**Completed By**: _______________

**Notes**:
