const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Store game states
// Structure: { roomId: { chess: ChessInstance, players: { white: socketId, black: socketId }, timers: { white: ms, black: ms }, lastMoveTime: timestamp } }
const games = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Create or Join a Game
    socket.on('joinGame', ({ roomId, timeControl }) => {
        // timeControl is in minutes, e.g., 5 for 5+0
        const timeInMs = (timeControl || 10) * 60 * 1000;

        if (!games[roomId]) {
            // Create new game
            games[roomId] = {
                chess: new Chess(),
                players: { white: socket.id, black: null },
                timers: { white: timeInMs, black: timeInMs },
                lastMoveTime: null,
                activeColor: 'w'
            };
            socket.join(roomId);
            socket.emit('playerColor', 'w');
            socket.emit('gameInit', { 
                fen: games[roomId].chess.fen(),
                timers: games[roomId].timers
            });
        } else if (!games[roomId].players.black) {
            // Join existing game
            games[roomId].players.black = socket.id;
            socket.join(roomId);
            socket.emit('playerColor', 'b');
            
            // Notify both players game starts
            io.to(roomId).emit('gameStart', {
                fen: games[roomId].chess.fen(),
                timers: games[roomId].timers
            });
        } else {
            socket.emit('error', 'Room is full');
        }
    });

    // Handle Move
    socket.on('makeMove', ({ roomId, move }) => {
        const game = games[roomId];
        
        if (!game) return;

        // Validate turn
        const isWhiteTurn = game.chess.turn() === 'w';
        const playerColor = game.players.white === socket.id ? 'w' : 'b';

        if ((isWhiteTurn && playerColor !== 'w') || (!isWhiteTurn && playerColor !== 'b')) {
            return; // Not your turn
        }

        // Update Timer
        const now = Date.now();
        if (game.lastMoveTime) {
            const elapsed = now - game.lastMoveTime;
            if (isWhiteTurn) {
                game.timers.white -= elapsed;
            } else {
                game.timers.black -= elapsed;
            }
        }
        game.lastMoveTime = now;

        // Check for timeout
        if (game.timers.white <= 0) {
            io.to(roomId).emit('gameOver', { winner: 'b', reason: 'timeout' });
            delete games[roomId];
            return;
        }
        if (game.timers.black <= 0) {
            io.to(roomId).emit('gameOver', { winner: 'w', reason: 'timeout' });
            delete games[roomId];
            return;
        }

        // Attempt Move
        try {
            const result = game.chess.move(move); // move is { from: 'e2', to: 'e4', promotion: 'q' }
            
            if (result) {
                // Broadcast move and new time
                io.to(roomId).emit('moveMade', {
                    move: result,
                    fen: game.chess.fen(),
                    timers: game.timers
                });

                // Check Game Over conditions
                if (game.chess.isGameOver()) {
                    let reason = '';
                    if (game.chess.isCheckmate()) reason = 'checkmate';
                    else if (game.chess.isDraw()) reason = 'draw';
                    
                    io.to(roomId).emit('gameOver', { 
                        winner: game.chess.turn() === 'w' ? 'b' : 'w', // Previous player won
                        reason 
                    });
                    delete games[roomId];
                }
            }
        } catch (e) {
            console.error('Invalid move attempt:', e);
        }
    });

    socket.on('disconnect', () => {
        // Handle disconnection (optional: auto-resign or pause)
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
