import { NextRequest, NextResponse } from 'next/server';

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
    game.loadPgn(pgn);
    const moves = game.history();
    const fens = game.history({ verbose: true }).map(m => m.after);
    fens.unshift(game.header().FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const uciMoves = game.history({ verbose: true }).map(m => m.from + m.to);

    // Import Chesskit's analysis functions
    const { getMovesClassification } = await import('@/lib/engine/helpers/moveClassification');
    const { computeAccuracy } = await import('@/lib/engine/helpers/accuracy');
    const { getPositionWinPercentage } = await import('@/lib/engine/helpers/winPercentage');
    const { computeEstimatedElo } = await import('@/lib/engine/helpers/estimateElo');

    // Analyze each position
    const rawPositions: any[] = [];
    
    for (let i = 0; i <= moves.length; i++) {
      const fen = fens[i];
      const tempGame = new Chess(fen);
      
      const lines = [{
        pv: i < moves.length ? [moves[i]] : [],
        cp: evaluatePositionSimple(tempGame),
        depth: 10,
        multiPv: 1
      }];
      
      rawPositions.push({
        lines,
        fen: fen
      });
    }

    // Classify moves using Chesskit's real logic
    const classifiedPositions = getMovesClassification(rawPositions, uciMoves, fens);
    
    // Compute accuracy
    const accuracy = computeAccuracy(classifiedPositions);
    
    // Estimate ELO
    const estimatedElo = computeEstimatedElo(classifiedPositions);
    
    // Build move classifications summary
    const moveClassifications = classifiedPositions.slice(1).map((pos: any, index: number) => ({
      moveNumber: index + 1,
      san: moves[index],
      uci: uciMoves[index],
      classification: pos.moveClassification,
      classificationLabel: getClassificationLabel(pos.moveClassification),
      winPercentage: getPositionWinPercentage(pos),
      opening: pos.opening || null
    }));

    // Count classifications
    const classificationCounts: Record<string, number> = {
      Splendid: 0,
      Perfect: 0,
      Best: 0,
      Excellent: 0,
      Okay: 0,
      Opening: 0,
      Forced: 0,
      Inaccuracy: 0,
      Mistake: 0,
      Blunder: 0,
    };

    for (const m of moveClassifications) {
      const key = String(m.classification);
      if (key in classificationCounts) {
        classificationCounts[key]++;
      }
    }

    // Get player names
    const header = game.header();

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
          white: Math.round(accuracy.white),
          black: Math.round(accuracy.black),
        },
        estimatedElo: estimatedElo ? {
          white: Math.round(estimatedElo.white),
          black: Math.round(estimatedElo.black),
        } : null,
        classifications: classificationCounts,
        moves: moveClassifications,
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

function evaluatePositionSimple(game: any): number {
  const pieceValues: Record<string, number> = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
  };
  
  let evaluation = 0;
  const board = game.board();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = pieceValues[piece.type];
        const multiplier = piece.color === 'w' ? 1 : -1;
        evaluation += value * multiplier;
        
        const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
        evaluation += Math.max(0, 10 - centerDist * 2) * multiplier;
      }
    }
  }
  
  return evaluation;
}

function getClassificationLabel(classification: string): string {
  const labels: Record<string, string> = {
    Splendid: 'Brilliant',
    Perfect: 'Great',
    Best: 'Best',
    Excellent: 'Excellent',
    Okay: 'Okay',
    Opening: 'Opening',
    Forced: 'Forced',
    Inaccuracy: 'Inaccuracy',
    Mistake: 'Mistake',
    Blunder: 'Blunder',
  };
  return labels[classification] || classification;
}