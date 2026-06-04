import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ 
    status: 'Live Analysis API. Send POST with FEN.'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fen } = body;

    if (!fen || typeof fen !== 'string') {
      return NextResponse.json({ error: 'FEN string is required' }, { status: 400 });
    }

    const { Chess } = await import('chess.js');
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });

    if (moves.length === 0) {
      return NextResponse.json({ success: true, gameOver: true });
    }

    const pieceValues: Record<string, number> = {
      p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
    };

    const evaluatedMoves = moves.map(move => {
      game.move(move);
      let evalScore = 0;
      const board = game.board();
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            const value = pieceValues[piece.type] || 0;
            evalScore += piece.color === 'w' ? value : -value;
          }
        }
      }
      game.undo();
      return { ...move, evaluation: evalScore };
    });

    const turn = game.turn();
    evaluatedMoves.sort((a, b) => turn === 'w' ? b.evaluation - a.evaluation : a.evaluation - b.evaluation);

    const bestMove = evaluatedMoves[0];

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}