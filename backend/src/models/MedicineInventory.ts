import { Schema, model, Document } from 'mongoose';

export interface IMedicineInventory extends Document {
  name: string;
  category: string; // e.g. "Antibiotic", "Analgesic", "Antihypertensive"
  dosageForm: string; // "Tablet", "Syrup", "Injection", "Capsule"
  stockQuantity: number;
  unitPrice: number;
  reorderLevel: number;
  batchNumber: string;
  expiryDate: Date;
  manufacturer?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineInventorySchema = new Schema<IMedicineInventory>(
  {
    name: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    dosageForm: { type: String, required: true, default: 'Tablet' },
    stockQuantity: { type: Number, required: true, default: 100, min: 0 },
    unitPrice: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 20 },
    batchNumber: { type: String, required: true, default: 'BATCH-2026-A' },
    expiryDate: { type: Date, required: true, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    manufacturer: { type: String, default: 'Nexora Pharma Labs' },
  },
  { timestamps: true }
);

export const MedicineInventory = model<IMedicineInventory>('MedicineInventory', MedicineInventorySchema);
