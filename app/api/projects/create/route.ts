import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import { createProject } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { name } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    const project = await createProject(sessionId, name.trim());
    
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

