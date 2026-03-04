// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve static files from the client build
app.use(express.static(path.join(__dirname, '../client/dist')));

const io = new Server(server, {
  cors: {
    origin: '*', // change in production
  }
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join-room', ({ roomId, nickname }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.nickname = nickname || 'guest';

    // gather participants in room (exclude self)
    const participants = [];
    for (const [id, s] of io.of('/').sockets) {
      if (id === socket.id) continue;
      if (s.rooms.has(roomId)) {
        participants.push({ id, nickname: s.data.nickname || 'guest' });
      }
    }

    // send existing participants to the joining client
    socket.emit('participants', participants);

    // notify others that a user joined
    socket.to(roomId).emit('user-joined', { id: socket.id, nickname: socket.data.nickname });
  });

  socket.on('chat-message', (text) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const payload = {
      id: socket.id,
      nickname: socket.data.nickname || 'guest',
      text: text,
      ts: Date.now()
    };
    io.to(roomId).emit('chat-message', payload);
  });

  // signaling for WebRTC peers
  socket.on('signal', ({ to, signal }) => {
    // forward to the intended peer
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('user-left', { id: socket.id, nickname: socket.data.nickname });
    }
    console.log('socket disconnected', socket.id);
  });
});

// Serve index.html for any non-API route (React Router)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server listening on ${PORT}`));