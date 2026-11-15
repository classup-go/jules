import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Generate signed URL for a file path
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { filePath, bucket = 'homework-files', expiresIn = 3600 } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Generate signed URL (valid for 1 hour by default)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Signed URL generation error:', error);
      return NextResponse.json(
        { error: 'Failed to generate signed URL', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });

  } catch (error) {
    console.error('Signed URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
