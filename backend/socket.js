// Singleton socket.io instance — import this in any route that needs to emit events.
// Prevents circular imports between index.js and route files.
import { Server as SocketIOServer } from 'socket.io';

let io = null;

export function initSocketIO(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5100'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('[Socket.IO] Not initialized — call initSocketIO(httpServer) first');
  return io;
}
