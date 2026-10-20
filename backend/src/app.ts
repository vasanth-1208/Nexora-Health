import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import bcrypt from 'bcrypt';
import { User } from './models';

dotenv.config();

export const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Dynamic CORS handling
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin Netlify proxy)
      if (!origin) return callback(null, true);
      if (
        origin === FRONTEND_URL ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Fallback status check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    databaseConnected: mongoose.connection.readyState === 1,
  });
});

export const ensureLabUsers = async () => {
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
        phone: '9876543211',
      },
      {
        username: 'ctscan',
        name: 'CT Scan Modality Desk',
        role: 'DIAGNOSTICS',
        labType: 'CTSCAN',
        email: 'ctscan@nexora.com',
        phone: '9876543212',
      },
      {
        username: 'pathology',
        name: 'Pathology & Blood Lab',
        role: 'DIAGNOSTICS',
        labType: 'PATHOLOGY',
        email: 'pathology@nexora.com',
        phone: '9876543213',
      },
      {
        username: 'ecg',
        name: 'Cardiology / ECG Desk',
        role: 'DIAGNOSTICS',
        labType: 'CARDIOLOGY',
        email: 'ecg@nexora.com',
        phone: '9876543214',
      },
      {
        username: 'mri',
        name: 'MRI Scan Suite Desk',
        role: 'DIAGNOSTICS',
        labType: 'MRI',
        email: 'mri@nexora.com',
        phone: '9876543215',
      },
    ];

    for (const u of labUsers) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        await User.create({
          ...u,
          passwordHash: defaultHash,
          isActive: true,
        });
        console.log(`[Init] Created diagnostic lab user: ${u.username} (${u.name} - ${u.labType})`);
      } else if (!existing.labType || existing.labType !== u.labType) {
        existing.labType = u.labType;
        await existing.save();
        console.log(`[Init] Verified diagnostic lab user: ${u.username} (${u.name} - ${u.labType})`);
      }
    }
  } catch (err) {
    console.error('Failed to ensure lab users:', err);
  }
};
