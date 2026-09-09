import { Schema, model, Document, Types } from 'mongoose';

export interface IWardChangeRequest extends Document {
  admissionId: Types.ObjectId; // Ref Admission
  patientId: Types.ObjectId; // Ref Patient
  requestedWardId: Types.ObjectId; // Ref Ward
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedByDoctorId: Types.ObjectId; // Ref Doctor
  createdAt: Date;
  updatedAt: Date;
}

const WardChangeRequestSchema = new Schema<IWardChangeRequest>(
  {
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    requestedWardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      required: true,
    },
    requestedByDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  },
  { timestamps: true }
);

export const WardChangeRequest = model<IWardChangeRequest>('WardChangeRequest', WardChangeRequestSchema);
