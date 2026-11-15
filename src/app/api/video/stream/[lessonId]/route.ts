import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const supabase = await createClient();

    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à cette vidéo' },
        { status: 401 }
      );
    }

    // 2. Rate limiting check (10 requests per minute per user per lesson)
    const canAccess = checkRateLimit(user.id, `video:${lessonId}`, 10, 60000);

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez patienter quelques instants.' },
        { status: 429 }
      );
    }

    // 3. Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, classroom_id, storage_path, type, content_url')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson not found:', lessonError);
      return NextResponse.json(
        { error: 'Vidéo non trouvée' },
        { status: 404 }
      );
    }

    if (lesson.type !== 'video') {
      return NextResponse.json(
        { error: 'Cette leçon n\'est pas une vidéo' },
        { status: 400 }
      );
    }

    // Check if lesson has storage_path (new system) or content_url (old system)
    const videoPath = lesson.storage_path || lesson.content_url;

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Vidéo non disponible. Veuillez contacter le professeur.' },
        { status: 404 }
      );
    }

    // 4. Verify enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, video_access_enabled, access_expires_at')
      .eq('classroom_id', lesson.classroom_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (enrollmentError) {
      console.error('Enrollment check error:', enrollmentError);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification de votre inscription' },
        { status: 500 }
      );
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Vous devez être inscrit à ce cours pour accéder à cette vidéo' },
        { status: 403 }
      );
    }

    // Check if video access is enabled
    if (enrollment.video_access_enabled === false) {
      return NextResponse.json(
        { error: 'Votre accès aux vidéos a été désactivé. Contactez le support.' },
        { status: 403 }
      );
    }

    // Check if access has expired
    if (enrollment.access_expires_at) {
      const expiryDate = new Date(enrollment.access_expires_at);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Votre accès à ce cours a expiré' },
          { status: 403 }
        );
      }
    }

    // 5. Generate signed URL
    let signedUrl: string;

    if (lesson.storage_path) {
      // New system: Private storage with signed URLs
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('videos-private')
        .createSignedUrl(lesson.storage_path, 3600); // 1 hour expiry

      if (urlError || !signedUrlData) {
        console.error('Signed URL generation error:', urlError);
        return NextResponse.json(
          { error: 'Impossible de générer l\'URL de la vidéo' },
          { status: 500 }
        );
      }

      signedUrl = signedUrlData.signedUrl;
    } else {
      // Old system: Public URL (fallback for legacy videos)
      signedUrl = lesson.content_url;
    }

    // 6. Create access token for tracking
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const { error: tokenError } = await supabase
      .from('video_access_tokens')
      .insert({
        lesson_id: lessonId,
        student_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      // Don't fail the request if token creation fails
    }

    // 7. Get user display name for watermark
    const { data: userData } = await supabase
      .from('users')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    const watermarkText = userData?.display_name ||
                          userData?.email?.split('@')[0] ||
                          'Utilisateur';

    // 8. Return streaming data
    return NextResponse.json({
      videoUrl: signedUrl,
      token,
      expiresAt: expiresAt.toISOString(),
      watermark: {
        text: watermarkText,
        position: 'top-right'
      },
      lessonId: lesson.id,
      lessonTitle: lesson.title
    });

  } catch (error) {
    console.error('Video streaming error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors du chargement de la vidéo' },
      { status: 500 }
    );
  }
}
