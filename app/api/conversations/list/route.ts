import { NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import { getSessionConversations } from '@/app/lib/storage';

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const conversations = await getSessionConversations(sessionId);
    
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

