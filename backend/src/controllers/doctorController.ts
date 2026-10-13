import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Doctor, User } from '../models';

export const getAllDoctors = async (req: Request, res: Response) => {
  try {
    const doctors = await Doctor.find({})
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name code');
    return res.status(200).json(doctors);
  } catch (error: any) {
    console.error('Get doctors error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getDoctorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Doctor ID or Mongoose _id or username or employeeId
    let doctor: any = null;

    // 1. Check if id is a User username (e.g. 'doctor1')
    const user = await User.findOne({ username: id });
    if (user) {
      doctor = await Doctor.findOne({ userId: user._id })
        .populate('userId', 'name email phone')
        .populate('departmentId', 'name code');
      if (doctor) return res.status(200).json(doctor);
    }

    // 2. Check if id is a valid ObjectId (Doctor._id or User._id)
    if (mongoose.Types.ObjectId.isValid(id)) {
      doctor = await Doctor.findById(id)
        .populate('userId', 'name email phone')
        .populate('departmentId', 'name code');
      if (doctor) return res.status(200).json(doctor);

      doctor = await Doctor.findOne({ userId: id })
        .populate('userId', 'name email phone')
        .populate('departmentId', 'name code');
      if (doctor) return res.status(200).json(doctor);
    }

    // 3. Check by employeeId (case-insensitive)
    doctor = await Doctor.findOne({
      $or: [
        { employeeId: id },
        { employeeId: new RegExp(`^${id}$`, 'i') }
      ]
    })
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name code');

    if (doctor) {
      return res.status(200).json(doctor);
    }

    return res.status(404).json({ message: 'Doctor not found.' });
  } catch (error: any) {
    console.error('Get doctor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    const caller = (req as any).user;

    let doctor: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doctor = await Doctor.findById(id);
    }
    if (!doctor) {
      const user = await User.findOne({ username: id });
      if (user) doctor = await Doctor.findOne({ userId: user._id });
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ employeeId: new RegExp(`^${id}$`, 'i') });
    }

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // IDOR check: Only ADMIN can update any doctor's availability; DOCTOR can only update their own
    if (caller.role !== 'ADMIN' && doctor.userId.toString() !== caller.userId.toString()) {
      return res.status(403).json({ message: 'Access denied: You can only update your own availability.' });
    }

    doctor.isAvailable = Boolean(isAvailable);
    await doctor.save();

    return res.status(200).json({ message: 'Availability updated successfully.', doctor });
  } catch (error: any) {
    console.error('Update availability error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
