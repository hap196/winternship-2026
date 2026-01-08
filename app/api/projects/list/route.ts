import { NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import { getSessionProjects } from '@/app/lib/storage';

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const projects = await getSessionProjects(sessionId);
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

