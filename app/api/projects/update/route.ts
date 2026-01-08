import { NextRequest, NextResponse } from 'next/server';
import { updateProject } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { projectId, updates } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID required' },
        { status: 400 }
      );
    }
    
    await updateProject(projectId, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

