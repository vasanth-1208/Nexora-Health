import { Schema, model, Document, Types } from 'mongoose';

export interface IBedSet extends Document {
  name: string;
  wardId: Types.ObjectId;
}

const BedSetSchema = new Schema<IBedSet>({
  name: { type: String, required: true },
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
});

BedSetSchema.index({ name: 1, wardId: 1 }, { unique: true });

export const BedSet = model<IBedSet>('BedSet', BedSetSchema);
