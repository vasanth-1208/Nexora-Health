import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Block, Floor, Department, Ward, BedSet, Bed, Patient, Admission, Doctor } from '../models';
import { emitSocketEvent } from '../config/socket';
import { BedService } from '../services/bedService';

export const getBeds = async (req: Request, res: Response) => {
  try {
    const { blockId, floorId, wardId, bedSetId, status, search } = req.query;

    let filter: any = {};

    if (status) filter.status = status;
    if (search) {
      filter.bedId = new RegExp(String(search), 'i');
    }

    // Find sets that match block/floor/ward filter
    let setFilter: any = {};
    let wardFilter: any = {};
    let floorFilter: any = {};

    if (bedSetId && mongoose.Types.ObjectId.isValid(String(bedSetId))) {
      filter.bedSetId = bedSetId;
    } else if (wardId && mongoose.Types.ObjectId.isValid(String(wardId))) {
      const sets = await BedSet.find({ wardId });
      filter.bedSetId = { $in: sets.map(s => s._id) };
    } else if (floorId && mongoose.Types.ObjectId.isValid(String(floorId))) {
      const wards = await Ward.find({ floorId });
      const sets = await BedSet.find({ wardId: { $in: wards.map(w => w._id) } });
      filter.bedSetId = { $in: sets.map(s => s._id) };
    } else if (blockId && mongoose.Types.ObjectId.isValid(String(blockId))) {
      const floors = await Floor.find({ blockId });
      const wards = await Ward.find({ floorId: { $in: floors.map(f => f._id) } });
      const sets = await BedSet.find({ wardId: { $in: wards.map(w => w._id) } });
      filter.bedSetId = { $in: sets.map(s => s._id) };
    }

    const beds = await Bed.find(filter)
      .populate({
        path: 'bedSetId',
        populate: {
          path: 'wardId',
          populate: [
            { path: 'departmentId', select: 'name code' },
            { path: 'floorId', populate: { path: 'blockId' } },
          ],
        },
      })
      .populate({
        path: 'currentPatientId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ bedId: 1 });

    return res.status(200).json(beds);
  } catch (error: any) {
    console.error('Get beds error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getBedById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Resolve by Bed ID (like GM-M-001) or MongoDB _id
    let query: any = { _id: id };
    if (id.includes('-')) {
      query = { bedId: id };
    }

    const bed = await Bed.findOne(query)
      .populate({
        path: 'bedSetId',
        populate: {
          path: 'wardId',
          populate: [
            { path: 'departmentId' },
            { path: 'floorId', populate: { path: 'blockId' } },
          ],
        },
      })
      .populate({
        path: 'currentPatientId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    if (!bed) {
      return res.status(404).json({ message: 'Bed not found.' });
    }

    // If occupied or reserved, get detailed admission details
    let admissionDetails = null;
    if (bed.currentAdmissionId) {
      const admission = await Admission.findById(bed.currentAdmissionId)
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' }
        })
        .populate({
          path: 'patientId',
          populate: {
            path: 'assignedDoctors',
            populate: { path: 'userId', select: 'name' }
          }
        });
      admissionDetails = admission;
    }

    return res.status(200).json({ bed, admission: admissionDetails });
  } catch (error: any) {
    console.error('Get bed details error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const updateBedStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, maintenanceReason } = req.body;

    const allowedStatuses = ['AVAILABLE', 'CLEANING', 'MAINTENANCE', 'RESERVED', 'OCCUPIED', 'BLOCKED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid bed status. Can only transition to ${allowedStatuses.join(', ')}.` });
    }

    const updatedBed = await BedService.updateBedStatusControlled(
      id,
      status,
      (req as any).user,
      maintenanceReason
    );

    return res.status(200).json({ message: 'Bed status updated successfully.', bed: updatedBed });
  } catch (error: any) {
    console.error('Update bed status error:', error);
    const statusCode = error.message?.startsWith('INVALID_TRANSITION') ? 400 :
                       error.message?.startsWith('BED_NOT_FOUND') ? 404 : 500;
    return res.status(statusCode).json({ message: error.message || 'Internal server error.' });
  }
};

export const getHierarchy = async (req: Request, res: Response) => {
  try {
    const departments = await Department.find({});
    const blocks = await Block.find({});
    const floors = await Floor.find({}).populate('blockId');
    const wards = await Ward.find({}).populate('departmentId').populate('floorId');
    const bedSets = await BedSet.find({}).populate('wardId');

    return res.status(200).json({
      departments,
      blocks,
      floors,
      wards,
      bedSets,
    });
  } catch (error: any) {
    console.error('Get hierarchy error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const totalBeds = await Bed.countDocuments({});
    const available = await Bed.countDocuments({ status: 'AVAILABLE' });
    const reserved = await Bed.countDocuments({ status: 'RESERVED' });
    const occupied = await Bed.countDocuments({ status: 'OCCUPIED' });
    const cleaning = await Bed.countDocuments({ status: 'CLEANING' });
    const maintenance = await Bed.countDocuments({ status: 'MAINTENANCE' });

    const totalPatients = await Patient.countDocuments({});
    const totalDoctors = await Doctor.countDocuments({});

    const activeAdmissions = await Admission.countDocuments({
      admissionStatus: { $in: ['RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED'] }
    });

    return res.status(200).json({
      totalBeds,
      available,
      reserved,
      occupied,
      cleaning,
      maintenance,
      totalPatients,
      totalDoctors,
      activeAdmissions,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Admin structural creations
export const createBlock = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const block = await Block.create({ name });
    return res.status(201).json(block);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const createFloor = async (req: Request, res: Response) => {
  try {
    const { name, blockId } = req.body;
    const floor = await Floor.create({ name, blockId });
    return res.status(201).json(floor);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, code } = req.body;
    const department = await Department.create({ name, code });
    return res.status(201).json(department);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const createWard = async (req: Request, res: Response) => {
  try {
    const { name, departmentId, floorId, gender } = req.body;
    const ward = await Ward.create({ name, departmentId, floorId, gender });
    return res.status(201).json(ward);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const createBedSet = async (req: Request, res: Response) => {
  try {
    const { name, wardId } = req.body;
    const bedSet = await BedSet.create({ name, wardId });
    return res.status(201).json(bedSet);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const createBed = async (req: Request, res: Response) => {
  try {
    const { bedId, bedSetId, status } = req.body;
    const bed = await Bed.create({ bedId, bedSetId, status });
    return res.status(201).json(bed);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
