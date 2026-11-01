const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3001;
app.use(express.static('public'));

// Phien ban khoi dau: he thong phong va dong bo online.
// Bo quan/luat chuan se duoc nap vao state sau khi xac nhan so do va quy tac truyen thong.
const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const emptyBoard = () => Array.from({ length: 12 }, () => Array(11).fill(null));

function publicState(room) {
  return {
    code: room.code,
    players: room.players.map(p => ({ name: p.name, side: p.side, connected: p.connected })),
    started: room.started,
    board: room.board,
    turn: room.turn,
    log: room.log.slice(-12)
  };
}
function emitRoom(room) { io.to(room.code).emit('room-state', publicState(room)); }

io.on('connection', socket => {
  socket.on('create-room', ({ name }) => {
    let code; do { code = makeCode(); } while (rooms.has(code));
    const room = { code, players: [{ id: socket.id, name: cleanName(name), side: 'red', connected: true }], started: false, board: emptyBoard(), turn: 'red', log: ['Phòng đã được tạo. Đang chờ người chơi Xanh.'] };
    rooms.set(code, room); socket.join(code); socket.data.room = code; socket.data.side = 'red';
    socket.emit('joined-room', { code, side: 'red' }); emitRoom(room);
  });

  socket.on('join-room', ({ code, name }) => {
    code = String(code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('error-message', 'Không tìm thấy phòng. Hãy kiểm tra mã phòng.');
    if (room.players.length >= 2) return socket.emit('error-message', 'Phòng đã đủ 2 người chơi.');
    const player = { id: socket.id, name: cleanName(name), side: 'blue', connected: true };
    room.players.push(player); socket.join(code); socket.data.room = code; socket.data.side = 'blue';
    room.log.push(`${player.name} đã tham gia. Hai người chơi đã sẵn sàng.`);
    socket.emit('joined-room', { code, side: 'blue' }); emitRoom(room);
  });

  socket.on('start-game', () => {
    const room = rooms.get(socket.data.room);
    if (!room || room.players.length !== 2) return;
    if (room.players[0].id !== socket.id) return socket.emit('error-message', 'Chủ phòng mới có thể bắt đầu ván.');
    room.started = true; room.turn = 'red'; room.log.push('Ván thử nghiệm đã bắt đầu.'); emitRoom(room);
  });

  // Nuoc di demo de kiem tra dong bo. Chua ap dung luat di chuyen quan truyen thong.
  socket.on('demo-move', ({ from, to }) => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.started || room.players.length !== 2) return;
    const side = socket.data.side;
    if (room.turn !== side) return socket.emit('error-message', 'Chưa đến lượt của bạn.');
    const valid = p => p && Number.isInteger(p.r) && Number.isInteger(p.c) && p.r >= 0 && p.r < 12 && p.c >= 0 && p.c < 11;
    if (!valid(from) || !valid(to)) return;
    const piece = room.board[from.r][from.c];
    if (!piece || piece.side !== side || room.board[to.r][to.c]) return socket.emit('error-message', 'Nước đi thử không hợp lệ.');
    room.board[to.r][to.c] = piece; room.board[from.r][from.c] = null;
    room.turn = side === 'red' ? 'blue' : 'red';
    const player = room.players.find(p => p.side === side);
    room.log.push(`${player?.name || side} di chuyển quân thử nghiệm.`); emitRoom(room);
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.room); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) { player.connected = false; room.log.push(`${player.name} đã mất kết nối.`); }
    emitRoom(room);
    setTimeout(() => {
      const current = rooms.get(room.code);
      if (current && current.players.every(p => !p.connected)) rooms.delete(room.code);
    }, 60000);
  });
});
function cleanName(value) { return String(value || 'Người chơi').trim().slice(0, 18) || 'Người chơi'; }
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Co Tu Lenh Online dang chay tai cong ${PORT}`);
});
