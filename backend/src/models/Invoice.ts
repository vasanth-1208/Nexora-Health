import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoiceLineItem {
  description: string;
  category: 'CONSULTATION' | 'ADMISSION_DEPOSIT' | 'BED_STAY' | 'DIAGNOSTIC' | 'PHARMACY' | 'NURSING' | 'OTHER';
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string; // e.g. "INV-2026-1001"
  patientId: Types.ObjectId;
  admissionId?: Types.ObjectId;
  consultationId?: Types.ObjectId;
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxRate: number; // Percentage e.g. 5%
  taxAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'INSURANCE';
  notes?: string;
  generatedBy: string; // Name or role of operator
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['CONSULTATION', 'ADMISSION_DEPOSIT', 'BED_STAY', 'DIAGNOSTIC', 'PHARMACY', 'NURSING', 'OTHER'],
    required: true,
  },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', index: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
    lineItems: [InvoiceLineItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
      default: 'PENDING',
      required: true,
    },
    paymentMethod: { type: String, enum: ['CASH', 'CARD', 'UPI', 'INSURANCE'] },
    notes: { type: String },
    generatedBy: { type: String, default: 'System' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Invoice = model<IInvoice>('Invoice', InvoiceSchema);
