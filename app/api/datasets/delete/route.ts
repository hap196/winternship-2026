import { NextRequest, NextResponse } from 'next/server';
import { deleteDataset } from '@/app/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { datasetId } = await request.json();
    
    if (!datasetId) {
      return NextResponse.json(
        { error: 'Dataset ID required' },
        { status: 400 }
      );
    }
    
    await deleteDataset(datasetId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return NextResponse.json(
      { error: 'Failed to delete dataset' },
      { status: 500 }
    );
  }
}

