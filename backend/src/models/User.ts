import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string; // Employee ID or Patient ID
  passwordHash: string;
  role: 'ADMIN' | 'RECEPTION' | 'DOCTOR' | 'NURSE' | 'WARD_STAFF' | 'DIAGNOSTICS' | 'PHARMACY' | 'BILLING' | 'PATIENT';
  labType?: string; // 'ALL' | 'XRAY' | 'CTSCAN' | 'PATHOLOGY' | 'CARDIOLOGY' | 'MRI'
  name: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['ADMIN', 'RECEPTION', 'DOCTOR', 'NURSE', 'WARD_STAFF', 'DIAGNOSTICS', 'PHARMACY', 'BILLING', 'PATIENT'],
    },
    labType: { type: String, default: 'ALL' },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
