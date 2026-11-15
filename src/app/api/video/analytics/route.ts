import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

interface AnalyticsPayload {
  lessonId: string;
  watchDuration: number; // in seconds
  lastPosition: number; // in seconds
  completed?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: AnalyticsPayload = await request.json();
    const { lessonId, watchDuration, lastPosition, completed } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Missing lessonId' },
        { status: 400 }
      );
    }

    // 3. Rate limiting (max 1 update per 5 seconds per lesson)
    // This prevents spamming the API with frequent updates
    const canUpdate = checkRateLimit(user.id, `analytics:${lessonId}`, 1, 5000);

    if (!canUpdate) {
      // Return success but don't actually update to avoid errors
      return NextResponse.json({ success: true, rateLimited: true });
    }

    // 4. Verify lesson exists and user is enrolled
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, classroom_id, type')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('classroom_id', lesson.classroom_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled' },
        { status: 403 }
      );
    }

    // 5. Upsert video analytics
    const { error: analyticsError } = await supabase
      .from('video_analytics')
      .upsert({
        lesson_id: lessonId,
        student_id: user.id,
        watch_duration: Math.floor(watchDuration),
        last_position: Math.floor(lastPosition),
        completed: completed || false,
        watched_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id,student_id',
        ignoreDuplicates: false
      });

    if (analyticsError) {
      console.error('Analytics error:', analyticsError);
      return NextResponse.json(
        { error: 'Failed to save analytics' },
        { status: 500 }
      );
    }

    // 6. If video is completed, mark lesson as completed
    if (completed) {
      const { error: progressError } = await supabase
        .from('student_progress')
        .upsert({
          student_id: user.id,
          lesson_id: lessonId,
          classroom_id: lesson.classroom_id,
          status: 'completed',
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,lesson_id',
          ignoreDuplicates: false
        });

      if (progressError) {
        console.error('Progress update error:', progressError);
        // Don't fail the request if progress update fails
      }
    }

    return NextResponse.json({
      success: true,
      analyticsUpdated: true,
      progressUpdated: completed || false
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve analytics for a specific lesson
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get lessonId from query params
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Missing lessonId parameter' },
        { status: 400 }
      );
    }

    // Fetch analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (analyticsError) {
      console.error('Analytics fetch error:', analyticsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analytics: analytics || {
        watch_duration: 0,
        last_position: 0,
        completed: false
      }
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
