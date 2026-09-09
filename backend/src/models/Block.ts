import { Schema, model, Document } from 'mongoose';

export interface IBlock extends Document {
  name: string;
}

const BlockSchema = new Schema<IBlock>({
  name: { type: String, required: true, unique: true },
});

export const Block = model<IBlock>('Block', BlockSchema);
