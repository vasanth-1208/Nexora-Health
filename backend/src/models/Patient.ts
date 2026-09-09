import { Schema, model, Document, Types } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface IPatient extends Document {
  userId: Types.ObjectId; // Ref User
  patientId: string; // e.g. "P1001" (unique custom ID)
  dob: Date;
  gender: string;
  address?: string;
  emergencyContact: IEmergencyContact;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string;
  foodPreference: 'NORMAL' | 'VEGETARIAN' | 'NON_VEGETARIAN' | 'DIABETIC' | 'CUSTOM';
  maritalStatus?: string;
  alternatePhone?: string;
  identificationType?: string;
  identificationNumber?: string;
  occupation?: string;
  ongoingMedications?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  currentAdmissionId?: Types.ObjectId; // Ref Admission
  assignedDoctors: Types.ObjectId[]; // Ref Doctor
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relationship: { type: String, required: true },
});

const PatientSchema = new Schema<IPatient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: { type: String, required: true, unique: true, index: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    address: { type: String },
    emergencyContact: { type: EmergencyContactSchema, required: true },
    bloodGroup: { type: String },
    medicalHistory: { type: String },
    allergies: { type: String },
    foodPreference: {
      type: String,
      enum: ['NORMAL', 'VEGETARIAN', 'NON_VEGETARIAN', 'DIABETIC', 'CUSTOM'],
      default: 'NORMAL',
      required: true,
    },
    maritalStatus: { type: String },
    alternatePhone: { type: String },
    identificationType: { type: String },
    identificationNumber: { type: String },
    occupation: { type: String },
    ongoingMedications: { type: String },
    insuranceProvider: { type: String },
    insurancePolicyNumber: { type: String },
    currentAdmissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
    assignedDoctors: [{ type: Schema.Types.ObjectId, ref: 'Doctor' }],
  },
  { timestamps: true }
);

export const Patient = model<IPatient>('Patient', PatientSchema);
