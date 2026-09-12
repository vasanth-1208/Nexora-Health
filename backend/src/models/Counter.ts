import { Schema, model } from 'mongoose';

export interface ICounter {
  _id: string; // sequence identifier, e.g. 'patientId', 'invoiceNumber'
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0, required: true },
});

export const Counter = model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increments and returns the next sequential number.
 * Concurrency-safe across multiple cluster/app instances.
 */
export const getNextSequence = async (sequenceName: string, initialValue: number = 1000): Promise<number> => {
  const result = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // If newly created counter with seq = 1, adjust to start at initialValue + 1
  if (result.seq === 1 && initialValue > 0) {
    result.seq = initialValue + 1;
    await result.save();
  }

  return result.seq;
};
