import mongoose from 'mongoose';
import { Bed, IBed } from '../models';
import { emitSocketEvent } from '../config/socket';

export class BedService {
  /**
   * Concurrency-safe atomic bed reservation.
   * Uses findOneAndUpdate with status: 'AVAILABLE' condition.
   * If two simultaneous requests try to reserve the same bed, exactly ONE will succeed.
   * The other will return null, allowing a 409 Conflict to be returned.
   */
  static async reserveBed(bedId: string, patientId: any, admissionId: any): Promise<IBed> {
    const bed = await Bed.findOneAndUpdate(
      { _id: bedId, status: 'AVAILABLE' },
      {
        $set: {
          status: 'RESERVED',
          currentPatientId: patientId,
          currentAdmissionId: admissionId,
          reservedTime: new Date(),
        },
      },
      { new: true }
    ).populate({
      path: 'bedSetId',
      populate: { path: 'wardId' },
    });

    if (!bed) {
      throw new Error('CONCURRENCY_CONFLICT: Bed is no longer available or has already been reserved by another staff member.');
    }

    // Broadcast realtime update to ward and reception
    emitSocketEvent('bed:updated', bed);
    return bed;
  }

  /**
   * Transition bed from RESERVED to OCCUPIED when patient physically arrives at ward.
   */
  static async occupyBed(bedId: string, patientId: any, admissionId: any): Promise<IBed> {
    const bed = await Bed.findOneAndUpdate(
      { _id: bedId, status: { $in: ['RESERVED', 'AVAILABLE'] } },
      {
        $set: {
          status: 'OCCUPIED',
          currentPatientId: patientId,
          currentAdmissionId: admissionId,
          occupiedTime: new Date(),
        },
      },
      { new: true }
    );

    if (!bed) {
      throw new Error('INVALID_TRANSITION: Bed must be in RESERVED or AVAILABLE state to mark OCCUPIED.');
    }

    emitSocketEvent('bed:updated', bed);
    return bed;
  }

  /**
   * Transition bed from OCCUPIED to CLEANING upon patient discharge.
   */
  static async sendToCleaning(bedId: string): Promise<IBed> {
    const bed = await Bed.findOneAndUpdate(
      { _id: bedId, status: 'OCCUPIED' },
      {
        $set: {
          status: 'CLEANING',
          currentPatientId: undefined,
          currentAdmissionId: undefined,
          reservedTime: undefined,
          occupiedTime: undefined,
        },
      },
      { new: true }
    );

    if (!bed) {
      throw new Error('INVALID_TRANSITION: Bed must be in OCCUPIED state to transition to CLEANING.');
    }

    emitSocketEvent('bed:updated', bed);
    return bed;
  }

  /**
   * Transition bed from CLEANING to AVAILABLE once sanitized.
   */
  static async finishCleaning(queryId: string): Promise<IBed> {
    let query: any = { _id: queryId, status: 'CLEANING' };
    if (queryId.includes('-')) {
      query = { bedId: queryId, status: 'CLEANING' };
    }

    const bed = await Bed.findOneAndUpdate(
      query,
      {
        $set: {
          status: 'AVAILABLE',
          currentPatientId: undefined,
          currentAdmissionId: undefined,
          reservedTime: undefined,
          occupiedTime: undefined,
          maintenanceReason: undefined,
        },
      },
      { new: true }
    );

    if (!bed) {
      throw new Error('INVALID_TRANSITION: Bed is not in CLEANING state or was not found.');
    }

    emitSocketEvent('bed:updated', bed);
    return bed;
  }

  /**
   * Release a reserved bed back to AVAILABLE (e.g. ward change or cancellation).
   */
  static async releaseReservation(bedId: any): Promise<IBed | null> {
    const bed = await Bed.findOneAndUpdate(
      { _id: bedId, status: 'RESERVED' },
      {
        $set: {
          status: 'AVAILABLE',
          currentPatientId: undefined,
          currentAdmissionId: undefined,
          reservedTime: undefined,
        },
      },
      { new: true }
    );

    if (bed) {
      emitSocketEvent('bed:updated', bed);
    }
    return bed;
  }

  /**
   * Central domain state machine controller for bed status changes.
   * Enforces valid lifecycle transitions and blocks illegal state jumps.
   */
  static async updateBedStatusControlled(
    identifier: string,
    targetStatus: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'BLOCKED',
    _operator?: { name?: string; role?: string; userId?: string },
    reason?: string
  ): Promise<IBed> {
    let bed: IBed | null = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      bed = await Bed.findById(identifier);
    }
    if (!bed) {
      bed = await Bed.findOne({ bedId: identifier });
    }
    if (!bed) {
      throw new Error('BED_NOT_FOUND: Specified bed does not exist.');
    }

    const currentStatus = bed.status;

    // Idempotent:
    if (currentStatus === targetStatus) {
      return bed;
    }

    // Allowed transition mapping:
    const allowedTransitions: Record<string, string[]> = {
      AVAILABLE: ['RESERVED', 'MAINTENANCE', 'BLOCKED', 'CLEANING'],
      RESERVED: ['OCCUPIED', 'AVAILABLE', 'MAINTENANCE', 'BLOCKED'],
      OCCUPIED: ['CLEANING'],
      CLEANING: ['AVAILABLE', 'MAINTENANCE', 'BLOCKED'],
      MAINTENANCE: ['AVAILABLE', 'CLEANING'],
      BLOCKED: ['AVAILABLE', 'CLEANING', 'MAINTENANCE'],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(`INVALID_TRANSITION: Cannot transition bed directly from ${currentStatus} to ${targetStatus}.`);
    }

    // Safety checks:
    // If transitioning to OCCUPIED, must not be from CLEANING
    if (targetStatus === 'OCCUPIED' && currentStatus === 'CLEANING') {
      throw new Error('INVALID_TRANSITION: Bed is currently undergoing sanitation. Cannot mark as OCCUPIED.');
    }

    // Clear patient associations when freed or placed in cleaning/maintenance
    if (targetStatus === 'AVAILABLE' || targetStatus === 'CLEANING' || targetStatus === 'MAINTENANCE' || targetStatus === 'BLOCKED') {
      bed.currentPatientId = undefined;
      bed.currentAdmissionId = undefined;
      bed.reservedTime = undefined;
      bed.occupiedTime = undefined;
    }

    if (targetStatus === 'MAINTENANCE' || targetStatus === 'BLOCKED') {
      bed.maintenanceReason = reason || 'Administrative maintenance';
    } else {
      bed.maintenanceReason = undefined;
    }

    bed.status = targetStatus as any;
    await bed.save();

    const populatedBed = await Bed.findById(bed._id).populate({
      path: 'bedSetId',
      populate: {
        path: 'wardId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'floorId', populate: { path: 'blockId' } },
        ],
      },
    });

    emitSocketEvent('bed:updated', populatedBed || bed);
    return populatedBed || bed;
  }
}
