import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app, ensureLabUsers } from './app';
import { initSocket } from './config/socket';

dotenv.config();

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora_health';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Connect to MongoDB Atlas and Start Server
console.log('Connecting to database...');
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Database connection established successfully.');

    // Ensure specialized lab accounts exist
    await ensureLabUsers();

    // Initialize Socket.IO
    initSocket(server, FRONTEND_URL);
    console.log('Socket.IO server initialized.');

    server.listen(PORT, () => {
      console.log(`Nexora Health backend listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
