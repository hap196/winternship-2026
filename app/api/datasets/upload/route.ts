import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import { saveDataset } from '@/app/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }
    
    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error('FormData parsing error:', e);
      return NextResponse.json(
        { error: 'Failed to parse upload. File may be too large.' },
        { status: 413 }
      );
    }
    
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log(`Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataset = await saveDataset(sessionId, file.name, buffer);
    
    console.log(`✓ Saved: ${dataset.id}`);
    
    return NextResponse.json({ dataset });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

