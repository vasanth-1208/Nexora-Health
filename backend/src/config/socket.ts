import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

let io: Server | null = null;

export const initSocket = (server: HttpServer, frontendUrl: string): Server => {
  io = new Server(server, {
    cors: {
      origin: frontendUrl || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket Authentication Middleware - Strict Token Verification
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('AUTHENTICATION_REQUIRED: Socket connection requires bearer JWT.'));
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err: any) {
      return next(new Error('AUTHENTICATION_FAILED: Invalid or expired socket token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    // Auto-join authorized channels for this user
    socket.join(`room:role_${user.role}`);
    socket.join(`room:user_${user.userId}`);
    socket.join(`room:user_${user.username}`);
    if (user.role === 'PATIENT') {
      socket.join(`room:patient_${user.userId}`);
      socket.join(`room:patient_${user.username}`);
    }

    // Explicit room joining with strict server-side authorization check
    socket.on('join_room', (roomName: string) => {
      if (typeof roomName !== 'string') return;

      const isAuthorized =
        user.role === 'ADMIN' ||
        roomName === `room:role_${user.role}` ||
        roomName === `room:user_${user.userId}` ||
        roomName === `room:user_${user.username}` ||
        roomName === `room:patient_${user.userId}` ||
        roomName === `room:patient_${user.username}` ||
        (['DOCTOR', 'NURSE', 'WARD_STAFF', 'RECEPTION', 'BILLING'].includes(user.role) && roomName.startsWith('room:patient_')) ||
        (['DOCTOR', 'NURSE', 'WARD_STAFF'].includes(user.role) && roomName.startsWith('room:ward_'));

      if (isAuthorized) {
        socket.join(roomName);
      } else {
        console.warn(`[Socket.IO] Access denied to unauthorized room: ${user.username} (${user.role}) attempted joining ${roomName}`);
        socket.emit('error', { message: `Access denied to room ${roomName}` });
      }
    });

    socket.on('disconnect', () => {
      // Disconnected cleanly
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

export const emitSocketEvent = (event: string, data: any, targetRoom?: string) => {
  if (!io) return;
  try {
    if (targetRoom) {
      io.to(targetRoom).emit(event, data);
    } else {
      io.emit(event, data);
    }
  } catch (error) {
    console.warn('Socket event emission failed:', error);
  }
};
