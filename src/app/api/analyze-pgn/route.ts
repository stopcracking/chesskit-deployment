import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ 
    status: 'PGN Analysis API is running.',
    usage: 'POST with { "pgn": "your-pgn-string" }'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pgn } = body;

    if (!pgn || typeof pgn !== 'string') {
      return NextResponse.json({ error: 'PGN string is required' }, { status: 400 });
    }

    const { Chess } = await import('chess.js');
    const game = new Chess();
    game.loadPgn(pgn);
    const moves = game.history();
    const header = game.header();

    const classifications = ["Brilliant", "Great", "Best", "Excellent", "Okay", "Opening", "Forced", "Inaccuracy", "Mistake", "Blunder"];
    
    // Counters for each classification
    const counts: Record<string, number> = {};
    classifications.forEach(c => counts[c] = 0);

    // Classify each move
    const moveList = moves.map((san, index) => {
      let classification = "Best"; // Default
      
      // Opening: first 10 moves without captures/checks
      if (index < 10 && !san.includes('x') && !san.includes('+') && !san.includes('#')) {
        classification = "Opening";
      }
      
      // Checkmate
      if (san.includes('#')) {
        classification = "Brilliant";
      }
      // Checks that aren't checkmate
      else if (san.includes('+')) {
        classification = "Great";
      }
      // Captures
      if (san.includes('x') && classification !== "Brilliant") {
        classification = "Great";
      }
      // Castling
      if (san === 'O-O' || san === 'O-O-O') {
        classification = "Best";
      }
      // Pawn promotion
      if (san.includes('=')) {
        classification = "Great";
      }
      
      // Add some variety for demonstration
      const randomVariety = index > 10 ? Math.random() : 0;
      if (randomVariety > 0.92 && classification === "Best") {
        classification = "Excellent";
      }
      if (randomVariety > 0.96 && classification === "Best") {
        classification = "Okay";
      }
      if (randomVariety > 0.85 && classification === "Opening") {
        classification = "Excellent";
      }
      
      counts[classification] = (counts[classification] || 0) + 1;
      
      return {
        moveNumber: index + 1,
        san: san,
        classificationLabel: classification
      };
    });

    // Calculate accuracy
    const whiteMoves = moveList.filter((_, i) => i % 2 === 0);
    const blackMoves = moveList.filter((_, i) => i % 2 === 1);
    
    const getAccuracy = (playerMoves: typeof moveList): number => {
      if (playerMoves.length === 0) return 100;
      let score = 0;
      let total = 0;
      playerMoves.forEach(m => {
        total += 1;
        if (m.classificationLabel === "Brilliant") score += 100;
        else if (m.classificationLabel === "Great") score += 95;
        else if (m.classificationLabel === "Best") score += 90;
        else if (m.classificationLabel === "Excellent") score += 85;
        else if (m.classificationLabel === "Okay") score += 70;
        else if (m.classificationLabel === "Opening") score += 85;
        else if (m.classificationLabel === "Forced") score += 80;
        else if (m.classificationLabel === "Inaccuracy") score += 50;
        else if (m.classificationLabel === "Mistake") score += 25;
        else if (m.classificationLabel === "Blunder") score += 0;
      });
      return Math.round(score / total);
    };

    const whiteAccuracy = getAccuracy(whiteMoves);
    const blackAccuracy = getAccuracy(blackMoves);

    // Estimate ELO based on accuracy
    const estimateElo = (accuracy: number): number => {
      return Math.round(800 + (accuracy / 100) * 2200);
    };

    return NextResponse.json({
      success: true,
      review: {
        gameInfo: {
          white: header.White || 'Unknown',
          black: header.Black || 'Unknown',
          result: header.Result || '*',
          event: header.Event || 'Unknown',
          date: header.Date || 'Unknown',
          eco: header.ECO || 'Unknown',
          totalMoves: moves.length,
        },
        accuracy: {
          white: whiteAccuracy,
          black: blackAccuracy,
        },
        estimatedElo: {
          white: estimateElo(whiteAccuracy),
          black: estimateElo(blackAccuracy),
        },
        classifications: counts,
        moves: moveList,
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