import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer, frontendUrl: string): Server => {
  io = new Server(server, {
    cors: {
      origin: frontendUrl || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join_room', (roomName: string) => {
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
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
  try {
    const ioInstance = getIO();
    if (targetRoom) {
      ioInstance.to(targetRoom).emit(event, data);
    } else {
      ioInstance.emit(event, data);
    }
  } catch (error) {
    console.warn('Socket event emission failed:', error);
  }
};
