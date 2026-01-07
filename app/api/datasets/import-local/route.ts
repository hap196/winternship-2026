import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found at specified path' },
        { status: 404 }
      );
    }
    
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    
    const dataset = {
      id: `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      name: fileName,
      fileName,
      fileSize: stats.size,
      filePath: filePath,
      createdAt: new Date().toISOString(),
    };
    
    const DATASETS_DIR = path.join(process.cwd(), 'data', 'datasets');
    if (!fs.existsSync(DATASETS_DIR)) {
      fs.mkdirSync(DATASETS_DIR, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(DATASETS_DIR, `${dataset.id}.json`),
      JSON.stringify(dataset, null, 2)
    );
    
    console.log(`✓ Imported local file: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return NextResponse.json({ dataset });
  } catch (error) {
    console.error('Error importing local file:', error);
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

