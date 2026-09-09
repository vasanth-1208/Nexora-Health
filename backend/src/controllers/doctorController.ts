import { Request, Response } from 'express';
import { Doctor } from '../models';

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
    const { id } = req.params; // Doctor ID or Mongoose _id
    let query: any = { _id: id };
    if (id.startsWith('doctor') || id.startsWith('doc')) {
      query = { employeeId: id };
    }

    const doctor = await Doctor.findOne(query)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name code');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    return res.status(200).json(doctor);
  } catch (error: any) {
    console.error('Get doctor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(id, { isAvailable }, { new: true });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    return res.status(200).json({ message: 'Availability updated successfully.', doctor });
  } catch (error: any) {
    console.error('Update availability error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
