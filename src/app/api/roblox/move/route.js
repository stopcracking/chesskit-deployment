import { NextResponse } from 'next/server';
import { Chess } from 'chess.js';

let currentGame = new Chess();

// ===== SUGGESTION FUNCTION (NOT USED YET - READY FOR LATER) =====
function getBestMove() {
    const moves = currentGame.moves({ verbose: true });
    if (!moves || moves.length === 0) return null;
    
    let bestMove = moves[0];
    for (const move of moves) {
        if (move.san && move.san.includes('x')) {
            bestMove = move;
            break;
        }
    }
    
    if (bestMove === moves[0]) {
        for (const move of moves) {
            if (move.san && move.san.includes('+')) {
                bestMove = move;
                break;
            }
        }
    }
    
    return {
        from: bestMove.from,
        to: bestMove.to,
        san: bestMove.san
    };
}
// ===== END SUGGESTION FUNCTION (NOT USED YET) =====

// POST - Make a move from Roblox
export async function POST(request) {
    try {
        const body = await request.json();
        const { from, to } = body;
        
        // Make the move on the board
        const move = currentGame.move({
            from: from,
            to: to,
            promotion: 'q'
        });
        
        if (move) {
            return NextResponse.json({
                success: true,
                fen: currentGame.fen(),
                move: { from: from, to: to },
                suggestion: getBestMove()
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid move'
            }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// GET - Get current board state
export async function GET() {
    return NextResponse.json({
        fen: currentGame.fen(),
        turn: currentGame.turn()
    });
}