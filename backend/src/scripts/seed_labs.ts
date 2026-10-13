import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models';

async function seedLabs() {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: Database seeding is prohibited in production environment to prevent data loss.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const hash = await bcrypt.hash('Password@123', 10);

  const labAccounts = [
    { username: 'xray', name: 'X-Ray Imaging Desk (K. Selvaraj)', role: 'DIAGNOSTICS' as const, labType: 'XRAY', email: 'xray@nexora.in', phone: '9840123460' },
    { username: 'ctscan', name: 'CT Scan Specialist Desk (R. Anand)', role: 'DIAGNOSTICS' as const, labType: 'CTSCAN', email: 'ctscan@nexora.in', phone: '9840123461' },
    { username: 'pathology', name: 'Pathology & Blood Lab (Dr. Kavitha S.)', role: 'DIAGNOSTICS' as const, labType: 'PATHOLOGY', email: 'pathology@nexora.in', phone: '9840123462' },
    { username: 'ecg', name: 'Cardiology & ECG Lab Desk (T. Shanthi)', role: 'DIAGNOSTICS' as const, labType: 'CARDIOLOGY', email: 'ecg@nexora.in', phone: '9840123463' },
    { username: 'mri', name: 'MRI Scan Suite Desk (M. Saravanan)', role: 'DIAGNOSTICS' as const, labType: 'MRI', email: 'mri@nexora.in', phone: '9840123464' },
  ];

  for (const acc of labAccounts) {
    const existing = await User.findOne({ username: acc.username });
    if (!existing) {
      await User.create({ ...acc, passwordHash: hash });
      console.log('Inserted lab account:', acc.username);
    } else {
      existing.labType = acc.labType;
      existing.name = acc.name;
      await existing.save();
      console.log('Updated lab account:', acc.username);
    }
  }

  await User.updateOne({ username: 'diagnostics' }, { $set: { labType: 'ALL' } });

  const all = await User.find({ role: 'DIAGNOSTICS' });
  console.log('Active diagnostic users in Atlas:', all.map((u: any) => ({ username: u.username, name: u.name, labType: u.labType })));
  process.exit(0);
}

seedLabs().catch(e => {
  console.error('Failed to seed labs:', e);
  process.exit(1);
});
