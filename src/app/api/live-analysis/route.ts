import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function GET() {
  return NextResponse.json({ 
    status: 'Live Analysis API - Multi-depth',
    cacheSize: cache.size
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fen, depth } = body;  // depth parameter from client

    if (!fen || typeof fen !== 'string') {
      return NextResponse.json({ error: 'FEN string is required' }, { status: 400 });
    }

    const requestedDepth = depth || 3; // Default 3-ply

    const normalizedFen = fen.split(' ').slice(0, 4).join(' ') + '_d' + requestedDepth;
    
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

    function evaluateBoard(g: any): number {
      let score = 0;
      const board = g.board();
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            const value = pieceValues[piece.type] || 0;
            score += piece.color === 'w' ? value : -value;
          }
        }
      }
      return score;
    }

    function alphaBeta(g: any, d: number, alpha: number, beta: number, isMax: boolean): number {
      if (d === 0 || g.isGameOver()) {
        if (g.isCheckmate()) return isMax ? -99999 + (requestedDepth - d) : 99999 - (requestedDepth - d);
        if (g.isDraw()) return 0;
        return evaluateBoard(g);
      }

      const legalMoves = g.moves({ verbose: true });
      legalMoves.sort((a: any, b: any) => {
        if (a.flags?.includes('c') && !b.flags?.includes('c')) return -1;
        if (!a.flags?.includes('c') && b.flags?.includes('c')) return 1;
        return 0;
      });

      if (isMax) {
        let maxEval = -Infinity;
        for (const move of legalMoves) {
          g.move(move);
          maxEval = Math.max(maxEval, alphaBeta(g, d - 1, alpha, beta, false));
          g.undo();
          alpha = Math.max(alpha, maxEval);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of legalMoves) {
          g.move(move);
          minEval = Math.min(minEval, alphaBeta(g, d - 1, alpha, beta, true));
          g.undo();
          beta = Math.min(beta, minEval);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    const isMax = game.turn() === 'w';
    let bestMove = moves[0];
    let bestScore = isMax ? -Infinity : Infinity;

    for (const move of moves) {
      game.move(move);
      const score = alphaBeta(game, requestedDepth - 1, -Infinity, Infinity, !isMax);
      game.undo();
      
      if (isMax) {
        if (score > bestScore) { bestScore = score; bestMove = move; }
      } else {
        if (score < bestScore) { bestScore = score; bestMove = move; }
      }
    }

    const result = {
      success: true,
      depth: requestedDepth,
      bestMove: {
        from: bestMove.from,
        to: bestMove.to,
        san: bestMove.san,
        evaluation: bestScore
      },
      gameOver: false
    };

    cache.set(normalizedFen, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}