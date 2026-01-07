import { NextResponse } from 'next/server';
import { getSessionId } from '@/app/lib/session';
import { getSessionDatasets } from '@/app/lib/storage';

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const datasets = await getSessionDatasets(sessionId);
    
    return NextResponse.json({ datasets });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    );
  }
}

