import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: string; // Target username, patient ID, employee ID, or role name
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'EMERGENCY';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'EMERGENCY'], default: 'INFO', required: true },
    isRead: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', NotificationSchema);
