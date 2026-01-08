import { NextRequest, NextResponse } from 'next/server';
import { deleteConversation } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }
    
    await deleteConversation(conversationId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

