import { NextRequest, NextResponse } from 'next/server';

// Force dynamic to ensure this runs as a serverless function
export const dynamic = 'force-dynamic';

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

    // Import Chess.js for PGN parsing
    const { Chess } = await import('chess.js');
    const game = new Chess();
    
    // Load the PGN
    game.loadPgn(pgn);
    const moves = game.history();
    const moveCount = moves.length;
    
    // Get game metadata
    const header = game.header();
    
    // Analyze each move with Stockfish (simplified - full analysis requires engine)
    // For now, return move classifications based on basic heuristics
    const analyzedMoves = moves.map((move, index) => {
      // Basic classification based on move characteristics
      let classification = 'Good';
      
      // Check for captures (simplified)
      if (move.includes('x')) {
        classification = 'Great';
      }
      
      // Check for checks
      if (move.includes('+')) {
        classification = 'Great';
      }
      
      // Check for checkmate
      if (move.includes('#')) {
        classification = 'Brilliant';
      }
      
      // Check for obvious blunders (very simplified)
      if (move.includes('??')) {
        classification = 'Blunder';
      }
      
      return {
        moveNumber: index + 1,
        san: move,
        classification: classification,
        fen: game.fen() // FEN after this move
      };
    });

    // Calculate basic statistics
    const classifications = {
      Brilliant: analyzedMoves.filter(m => m.classification === 'Brilliant').length,
      Great: analyzedMoves.filter(m => m.classification === 'Great').length,
      Good: analyzedMoves.filter(m => m.classification === 'Good').length,
      Mistake: analyzedMoves.filter(m => m.classification === 'Mistake').length,
      Blunder: analyzedMoves.filter(m => m.classification === 'Blunder').length,
    };

    // Estimate accuracy (simplified)
    const accuracy = {
      white: Math.min(100, 85 + (classifications.Brilliant * 2) + classifications.Great - (classifications.Blunder * 3)),
      black: Math.min(100, 85 + (classifications.Brilliant * 2) + classifications.Great - (classifications.Blunder * 3)),
    };

    return NextResponse.json({
      success: true,
      review: {
        gameInfo: {
          event: header.Event || 'Unknown',
          site: header.Site || 'Unknown',
          date: header.Date || 'Unknown',
          white: header.White || 'Unknown',
          black: header.Black || 'Unknown',
          result: header.Result || '*',
          eco: header.ECO || 'Unknown',
        },
        statistics: {
          totalMoves: moveCount,
          classifications: classifications,
          accuracy: accuracy,
        },
        moves: analyzedMoves,
        pgn: pgn,
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}