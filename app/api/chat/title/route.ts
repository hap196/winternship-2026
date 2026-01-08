import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function POST(request: NextRequest) {
  try {
    const { firstMessage } = await request.json();

    // Validate API key
    if (!OPENAI_API_KEY) {
      // Fallback to simple truncation
      const title = firstMessage.split('\n')[0].substring(0, 50);
      const fallbackTitle = title.length < firstMessage.length ? `${title}...` : title;
      return NextResponse.json({ title: fallbackTitle });
    }

    // Validate required fields
    if (!firstMessage) {
      return NextResponse.json(
        { error: 'Missing required field: firstMessage' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You generate concise conversation titles using 2-3 short words maximum. Return only the title, no quotes or punctuation.'
          },
          {
            role: 'user',
            content: `Generate a title for a conversation that starts with: "${firstMessage}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 15,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content?.trim() || firstMessage.substring(0, 50);

    return NextResponse.json({ title });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Title generation API error:', err);

    // Fallback to simple truncation on error
    const { firstMessage } = await request.json();
    const title = firstMessage.split('\n')[0].substring(0, 50);
    const fallbackTitle = title.length < firstMessage.length ? `${title}...` : title;

    return NextResponse.json({ title: fallbackTitle });
  }
}