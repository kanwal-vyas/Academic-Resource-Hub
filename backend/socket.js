import { Server as SocketIOServer } from 'socket.io';
import config from './config.js';

let io = null;

export function initSocketIO(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room based on course_id if provided in handshake auth
    const courseId = socket.handshake.auth?.courseId;
    const userId = socket.handshake.auth?.userId;

    if (courseId) {
      socket.join(`course:${courseId}`);
      console.log(`[Socket.IO] User ${userId || 'unknown'} joined course room: course:${courseId}`);
    }

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] User joined private room: user:${userId}`);
    }

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
