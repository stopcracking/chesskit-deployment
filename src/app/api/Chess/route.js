import { NextResponse } from 'next/server';

// In-memory game state (use database in production)
let currentGame = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn: 'white', // white or black
  moves: []
};

export async function POST(request: Request) {
  const body = await request.json();
  const { action, from, to, fen, movesCount } = body;

  // Action 1: Set a position and let both colors play
  if (action === 'setPosition') {
    currentGame.fen = fen;
    currentGame.turn = 'white'; // Assume white to move
    currentGame.moves = [];
    
    return NextResponse.json({ 
      success: true, 
      fen: currentGame.fen,
      turn: currentGame.turn 
    });
  }

  // Action 2: Make a move for current turn
  if (action === 'makeMove') {
    // Validate move (you'll implement your chess logic)
    const isValid = await validateMove(currentGame.fen, from, to);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }
    
    // Apply move and update FEN
    const newFen = await applyMove(currentGame.fen, from, to);
    currentGame.fen = newFen;
    currentGame.moves.push({ from, to, color: currentGame.turn });
    
    // Switch turn
    currentGame.turn = currentGame.turn === 'white' ? 'black' : 'white';
    
    return NextResponse.json({
      success: true,
      fen: currentGame.fen,
      turn: currentGame.turn,
      move: { from, to }
    });
  }

  // Action 3: Auto-play multiple moves (black AND white)
  if (action === 'autoPlay') {
    for (let i = 0; i < movesCount; i++) {
      // Get best move for current position & current turn
      const move = await getBestMove(currentGame.fen, currentGame.turn);
      
      if (!move) break; // Game over
      
      // Apply the move
      currentGame.fen = await applyMove(currentGame.fen, move.from, move.to);
      currentGame.moves.push({ ...move, color: currentGame.turn });
      
      // Switch turn for next iteration
      currentGame.turn = currentGame.turn === 'white' ? 'black' : 'white';
    }
    
    return NextResponse.json({
      success: true,
      fen: currentGame.fen,
      turn: currentGame.turn,
      movesMade: movesCount
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Helper functions (implement based on your chess library)
async function validateMove(fen: string, from: string, to: string): Promise<boolean> {
  // Use chess.js or your own logic
  // Example with chess.js:
  // const game = new Chess(fen);
  // const move = game.move({ from, to, promotion: 'q' });
  // return !!move;
  return true;
}

async function applyMove(fen: string, from: string, to: string): Promise<string> {
  // Return new FEN after move
  return fen;
}

async function getBestMove(fen: string, color: string): Promise<{ from: string; to: string } | null> {
  // Return best move for given position
  // You can use Stockfish API or simple random move for now
  return { from: 'e2', to: 'e4' };
}