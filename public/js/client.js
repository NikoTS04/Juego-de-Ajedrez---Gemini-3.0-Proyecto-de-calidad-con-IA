const socket = io();
let board = null;
let game = new Chess();
let roomId = null;
let playerColor = 'w';
let currentTimers = { white: 300000, black: 300000 };
let timerInterval = null;
let isGameActive = false;

// DOM Elements
const lobbyDiv = document.getElementById('lobby');
const gameDiv = document.getElementById('game');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomId');
const timeControlSelect = document.getElementById('timeControl');
const statusDiv = document.getElementById('status');
const whiteClockDiv = document.getElementById('playerClock'); // Will be assigned dynamically
const blackClockDiv = document.getElementById('opponentClock'); // Will be assigned dynamically

// Join Game
joinBtn.addEventListener('click', () => {
    roomId = roomIdInput.value;
    const timeControl = parseInt(timeControlSelect.value);
    if (roomId) {
        socket.emit('joinGame', { roomId, timeControl });
    } else {
        alert('Ingresa un nombre de sala');
    }
});

// Socket Events
socket.on('playerColor', (color) => {
    playerColor = color;
    lobbyDiv.style.display = 'none';
    gameDiv.style.display = 'flex';
    initBoard();
    updateStatus('Esperando oponente...');
});

socket.on('gameInit', (data) => {
    game.load(data.fen);
    currentTimers = data.timers;
    board.position(data.fen);
    updateClocks();
});

socket.on('gameStart', (data) => {
    game.load(data.fen);
    currentTimers = data.timers;
    board.position(data.fen);
    isGameActive = true;
    updateStatus('¡Juego iniciado! Juegan las blancas.');
    startTimer();
});

socket.on('moveMade', (data) => {
    game.move(data.move);
    board.position(game.fen());
    currentTimers = data.timers; // Sync time with server
    updateClocks();
    updateStatus();
});

socket.on('gameOver', (data) => {
    isGameActive = false;
    clearInterval(timerInterval);
    let msg = '';
    if (data.reason === 'checkmate') msg = `Jaque Mate. Ganador: ${data.winner === 'w' ? 'Blancas' : 'Negras'}`;
    else if (data.reason === 'timeout') msg = `Tiempo agotado. Ganador: ${data.winner === 'w' ? 'Blancas' : 'Negras'}`;
    else if (data.reason === 'draw') msg = 'Tablas';
    
    alert(msg);
    updateStatus(msg);
});

socket.on('error', (msg) => {
    alert(msg);
    location.reload();
});

// Board Logic
function initBoard() {
    const config = {
        draggable: true,
        position: 'start',
        orientation: playerColor === 'w' ? 'white' : 'black',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    board = Chessboard('myBoard', config);
    
    // Assign clocks correctly based on orientation
    if (playerColor === 'w') {
        document.getElementById('playerClock').id = 'whiteClock';
        document.getElementById('opponentClock').id = 'blackClock';
    } else {
        document.getElementById('playerClock').id = 'blackClock';
        document.getElementById('opponentClock').id = 'whiteClock';
    }
}

function onDragStart(source, piece, position, orientation) {
    if (!isGameActive) return false;
    if (game.game_over()) return false;

    // Only pick up own pieces
    if ((playerColor === 'w' && piece.search(/^b/) !== -1) ||
        (playerColor === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    // see if the move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    // Emit move to server
    socket.emit('makeMove', { roomId, move: move });
    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus(customMsg) {
    if (customMsg) {
        statusDiv.innerText = customMsg;
        return;
    }

    let status = '';
    let moveColor = game.turn() === 'w' ? 'Blancas' : 'Negras';

    if (game.in_checkmate()) {
        status = 'Juego terminado, ' + moveColor + ' está en jaque mate.';
    } else if (game.in_draw()) {
        status = 'Juego terminado, tablas.';
    } else {
        status = 'Turno de: ' + moveColor;
        if (game.in_check()) {
            status += ', ' + moveColor + ' está en jaque';
        }
    }
    statusDiv.innerText = status;
}

// Timer Logic
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!isGameActive) return;

        if (game.turn() === 'w') {
            currentTimers.white -= 100;
        } else {
            currentTimers.black -= 100;
        }
        updateClocks();
    }, 100);
}

function updateClocks() {
    const formatTime = (ms) => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const wClock = document.getElementById('whiteClock');
    const bClock = document.getElementById('blackClock');

    if (wClock) wClock.innerText = formatTime(currentTimers.white);
    if (bClock) bClock.innerText = formatTime(currentTimers.black);
}
