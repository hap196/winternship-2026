import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'data', 'temp');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    ensureDir(TEMP_DIR);
    
    const formData = await request.formData();
    const chunk = formData.get('chunk') as Blob;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const uploadId = formData.get('uploadId') as string;
    
    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const chunkPath = path.join(TEMP_DIR, `${uploadId}_chunk_${chunkIndex}`);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    fs.writeFileSync(chunkPath, buffer);
    
    console.log(`Chunk ${chunkIndex + 1}/${totalChunks} saved for ${fileName}`);
    
    if (chunkIndex === totalChunks - 1) {
      const DATASETS_DIR = path.join(process.cwd(), 'data', 'datasets');
      ensureDir(DATASETS_DIR);
      
      const existingDatasets = fs.readdirSync(DATASETS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const data = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, f), 'utf-8'));
          return data.sessionId === sessionId ? data : null;
        })
        .filter(Boolean);
      
      const extension = fileName.split('.').pop();
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      
      let counter = 0;
      let uniqueFileName = fileName;
      
      while (existingDatasets.some((d: any) => d?.fileName === uniqueFileName)) {
        counter++;
        uniqueFileName = `${nameWithoutExt} (${counter}).${extension}`;
      }
      
      if (uniqueFileName !== fileName) {
        console.log(`Renamed ${fileName} → ${uniqueFileName} to avoid duplicates`);
      }
      
      const finalPath = path.join(process.cwd(), 'data', 'uploads', `${uploadId}_${uniqueFileName}`);
      const writeStream = fs.createWriteStream(finalPath);
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkFile = path.join(TEMP_DIR, `${uploadId}_chunk_${i}`);
        const chunkData = fs.readFileSync(chunkFile);
        writeStream.write(chunkData);
        fs.unlinkSync(chunkFile);
      }
      
      writeStream.end();
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      const stats = fs.statSync(finalPath);
      
      const dataset = {
        id: uploadId,
        sessionId,
        name: uniqueFileName,
        fileName: uniqueFileName,
        fileSize: stats.size,
        filePath: finalPath,
        createdAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(
        path.join(DATASETS_DIR, `${dataset.id}.json`),
        JSON.stringify(dataset, null, 2)
      );
      
      console.log(`✓ Upload complete: ${uniqueFileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      return NextResponse.json({ dataset, complete: true });
    }
    
    return NextResponse.json({ success: true, complete: false });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json(
      { error: `Chunk upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

