import { NextRequest, NextResponse } from 'next/server';
import { updateConversation } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, title } = await request.json();

    if (!conversationId || !title?.trim()) {
      return NextResponse.json(
        { error: 'Conversation ID and title are required' },
        { status: 400 }
      );
    }

    await updateConversation(conversationId, { title: title.trim() });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error renaming conversation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to rename conversation' },
      { status: 500 }
    );
  }
}

