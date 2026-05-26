import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'PGN Analysis API is running. Send a POST request with a PGN body.',
    usage: 'POST to this URL with { "pgn": "your-pgn-string" }'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pgn } = body;

    if (!pgn || typeof pgn !== 'string') {
      return NextResponse.json({ error: 'PGN string is required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      pgn: pgn,
      message: 'PGN received successfully',
      analysis: {
        moves: pgn.split(' ').filter(m => m.includes('.')).length,
        received: true
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}