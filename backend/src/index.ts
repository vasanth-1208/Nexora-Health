import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { initSocket } from './config/socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora_health';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Fallback status check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    databaseConnected: mongoose.connection.readyState === 1,
  });
});

import bcrypt from 'bcrypt';
import { User } from './models';

const ensureLabUsers = async () => {
  try {
    const defaultHash = await bcrypt.hash('12345', 10);
    const labUsers = [
      {
        username: 'diagnostics',
        name: 'Bob Ross (All Labs Lead)',
        role: 'DIAGNOSTICS',
        labType: 'ALL',
        email: 'diagnostics@nexora.com',
        phone: '9876543217',
      },
      {
        username: 'xray',
        name: 'X-Ray Technician Desk',
        role: 'DIAGNOSTICS',
        labType: 'XRAY',
        email: 'xray@nexora.com',
        phone: '9876543230',
      },
      {
        username: 'ctscan',
        name: 'CT Scan Specialist Desk',
        role: 'DIAGNOSTICS',
        labType: 'CTSCAN',
        email: 'ctscan@nexora.com',
        phone: '9876543231',
      },
      {
        username: 'pathology',
        name: 'Pathology & Blood Lab Desk',
        role: 'DIAGNOSTICS',
        labType: 'PATHOLOGY',
        email: 'pathology@nexora.com',
        phone: '9876543232',
      },
      {
        username: 'ecg',
        name: 'Cardiology & ECG Lab Desk',
        role: 'DIAGNOSTICS',
        labType: 'CARDIOLOGY',
        email: 'ecg@nexora.com',
        phone: '9876543233',
      },
      {
        username: 'mri',
        name: 'MRI Scan Suite Desk',
        role: 'DIAGNOSTICS',
        labType: 'MRI',
        email: 'mri@nexora.com',
        phone: '9876543234',
      },
    ];

    for (const u of labUsers) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        await User.create({
          ...u,
          passwordHash: defaultHash,
        });
        console.log(`[Init] Created diagnostic lab user: ${u.username} (${u.name})`);
      } else {
        existing.labType = u.labType;
        existing.name = u.name;
        existing.role = 'DIAGNOSTICS';
        // Preserve user password if account already exists
        await existing.save();
        console.log(`[Init] Verified diagnostic lab user: ${u.username} (${u.name} - ${u.labType})`);
      }
    }
  } catch (err) {
    console.error('Failed to ensure lab users:', err);
  }
};

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
