import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import { createConversation } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { title, projectId } = await request.json();
    
    const conversation = await createConversation(sessionId, title, projectId);
    
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

