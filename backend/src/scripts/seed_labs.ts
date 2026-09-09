import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models';

async function seedLabs() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const hash = await bcrypt.hash('Password@123', 10);

  const labAccounts = [
    { username: 'xray', name: 'X-Ray Lab Desk', role: 'DIAGNOSTICS' as const, labType: 'XRAY', email: 'xray@nexora.com', phone: '9876543230' },
    { username: 'ctscan', name: 'CT Scan Lab Desk', role: 'DIAGNOSTICS' as const, labType: 'CTSCAN', email: 'ctscan@nexora.com', phone: '9876543231' },
    { username: 'pathology', name: 'Pathology & Blood Lab', role: 'DIAGNOSTICS' as const, labType: 'PATHOLOGY', email: 'pathology@nexora.com', phone: '9876543232' },
    { username: 'ecg', name: 'ECG & Cardiology Lab', role: 'DIAGNOSTICS' as const, labType: 'CARDIOLOGY', email: 'ecg@nexora.com', phone: '9876543233' },
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
