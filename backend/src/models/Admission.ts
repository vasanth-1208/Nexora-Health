import { Schema, model, Document, Types } from 'mongoose';

export interface IAdmission extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor (recommending doctor)
  wardId: Types.ObjectId; // Ref Ward (prescribed ward)
  bedId?: Types.ObjectId; // Ref Bed (selected bed)
  admissionStatus: 'RECOMMENDED' | 'PAID' | 'RESERVED' | 'OCCUPIED' | 'DISCHARGE_RECOMMENDED' | 'DISCHARGED';
  paymentStatus: 'PENDING' | 'PAID';
  paymentId?: Types.ObjectId; // Ref Payment (Initial admission payment)
  inDiagnostics?: boolean;
  diagnosticsLeftAt?: Date;
  admittedAt?: Date;
  dischargedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionSchema = new Schema<IAdmission>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    admissionStatus: {
      type: String,
      enum: ['RECOMMENDED', 'PAID', 'RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED', 'DISCHARGED'],
      default: 'RECOMMENDED',
      required: true,
    },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    inDiagnostics: { type: Boolean, default: false },
    diagnosticsLeftAt: { type: Date },
    admittedAt: { type: Date },
    dischargedAt: { type: Date },
  },
  { timestamps: true }
);

export const Admission = model<IAdmission>('Admission', AdmissionSchema);
