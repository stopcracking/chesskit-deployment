// src/app/api/roblox/move/route.js
import { NextResponse } from 'next/server';
import { Chess } from 'chess.js';

let game = new Chess();

export async POST(request) {
  const body = await request.json();
  const { from, to, promotion = 'q', gameId } = body;
  
  try {
    // Make the move from Roblox
    const move = game.move({
      from: from,
      to: to,
      promotion: promotion
    });
    
    // Return the result to Roblox
    return NextResponse.json({
      success: true,
      fen: game.fen(),
      move: move,
      turn: game.turn() === 'w' ? 'white' : 'black',
      isGameOver: game.game_over()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

// Get current board state
export async GET() {
  return NextResponse.json({
    fen: game.fen(),
    turn: game.turn(),
    moves: game.history()
  });
}