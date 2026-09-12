import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string; // Employee ID or Patient ID
  passwordHash: string;
  role: 'ADMIN' | 'RECEPTION' | 'DOCTOR' | 'NURSE' | 'WARD_STAFF' | 'DIAGNOSTICS' | 'PHARMACY' | 'BILLING' | 'PATIENT';
  labType?: string; // 'ALL' | 'XRAY' | 'CTSCAN' | 'PATHOLOGY' | 'CARDIOLOGY' | 'MRI'
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
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
    isActive: { type: Boolean, default: true, index: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
    passwordResetToken: { type: String, index: true },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
