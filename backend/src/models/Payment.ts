import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  patientId: Types.ObjectId; // Ref Patient
  serviceType: 'CONSULTATION' | 'REFERRAL' | 'DIAGNOSTIC' | 'ADMISSION' | 'PHARMACY' | 'OTHER';
  amount: number;
  status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID';
  referenceId?: Types.ObjectId; // ID of consultation, diagnostic request, admission, prescription, etc.
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    serviceType: {
      type: String,
      enum: ['CONSULTATION', 'REFERRAL', 'DIAGNOSTIC', 'ADMISSION', 'PHARMACY', 'OTHER'],
      required: true,
    },
    amount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'PARTIALLY_PAID'],
      default: 'PENDING',
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId },
    description: { type: String },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', PaymentSchema);
