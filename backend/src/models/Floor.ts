import { Schema, model, Document, Types } from 'mongoose';

export interface IFloor extends Document {
  name: string;
  blockId: Types.ObjectId;
}

const FloorSchema = new Schema<IFloor>({
  name: { type: String, required: true },
  blockId: { type: Schema.Types.ObjectId, ref: 'Block', required: true },
});

// A floor name should be unique within the same block
FloorSchema.index({ name: 1, blockId: 1 }, { unique: true });

export const Floor = model<IFloor>('Floor', FloorSchema);
