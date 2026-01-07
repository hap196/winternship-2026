import { NextRequest, NextResponse } from 'next/server';
import { updateConversation } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, updates } = await request.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }
    
    await updateConversation(conversationId, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

