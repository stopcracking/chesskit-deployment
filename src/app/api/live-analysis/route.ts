import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  return NextResponse.json({ 
    status: 'Live Analysis API with cache.',
    cacheSize: cache.size
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fen } = body;

    if (!fen || typeof fen !== 'string') {
      return NextResponse.json({ error: 'FEN string is required' }, { status: 400 });
    }

    // Normalize FEN (remove move counters)
    const normalizedFen = fen.split(' ').slice(0, 4).join(' ');
    
    // Check cache
    const cached = cache.get(normalizedFen);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    const { Chess } = await import('chess.js');
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });

    if (moves.length === 0) {
      const result = { success: true, gameOver: true };
      cache.set(normalizedFen, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    const pieceValues: Record<string, number> = {
      p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
    };

    const evaluatedMoves = moves.map(move => {
      game.move(move);
      
      let opponentBestScore = -Infinity;
      const opponentMoves = game.moves({ verbose: true });
      
      for (const oppMove of opponentMoves) {
        game.move(oppMove);
        let score = 0;
        const board = game.board();
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
              const value = pieceValues[piece.type] || 0;
              score += piece.color === 'w' ? value : -value;
            }
          }
        }
        game.undo();
        if (score > opponentBestScore) opponentBestScore = score;
      }
      
      game.undo();
      
      const turn = game.turn();
      const adjustedScore = turn === 'w' ? opponentBestScore : -opponentBestScore;
      
      return { ...move, evaluation: adjustedScore };
    });

    const turn = game.turn();
    evaluatedMoves.sort((a, b) => turn === 'w' ? b.evaluation - a.evaluation : a.evaluation - b.evaluation);

    const bestMove = evaluatedMoves[0];

    const result = {
      success: true,
      bestMove: {
        from: bestMove.from,
        to: bestMove.to,
        san: bestMove.san,
        evaluation: bestMove.evaluation
      },
      topLines: evaluatedMoves.slice(0, 3).map(m => ({
        from: m.from, to: m.to, san: m.san, evaluation: m.evaluation
      })),
      gameOver: false
    };

    // Store in cache
    cache.set(normalizedFen, { data: result, timestamp: Date.now() });
    
    // Clean old cache entries periodically
    if (cache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of cache) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}