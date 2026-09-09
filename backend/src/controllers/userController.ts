import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User, Doctor, Department } from '../models';

export const registerStaff = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      name,
      email,
      phone,
      departmentId, // Required for doctors
      role,
      password,
      specialization, // Required for doctors
    } = req.body;

    if (!employeeId || !name || !role || !password) {
      return res.status(400).json({ message: 'Employee ID, name, role, and password are required.' });
    }

    if (role === 'PATIENT') {
      return res.status(400).json({ message: 'Patient accounts must be registered using the Reception portal.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: employeeId });
    if (existingUser) {
      return res.status(400).json({ message: `Staff user with Employee ID ${employeeId} already exists.` });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User record
    const user = await User.create({
      username: employeeId,
      passwordHash,
      role,
      name,
      email,
      phone,
    });

    // If role is DOCTOR, create Doctor profile
    if (role === 'DOCTOR') {
      if (!departmentId || !specialization) {
        // Rollback user creation
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'Department and specialization are required for Doctor registration.' });
      }

      const departmentExists = await Department.findById(departmentId);
      if (!departmentExists) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'Department does not exist.' });
      }

      await Doctor.create({
        userId: user._id,
        employeeId,
        departmentId,
        specialization,
        isAvailable: true,
      });
    }

    return res.status(201).json({
      message: `${role} account registered successfully.`,
      employeeId,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Register staff error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staff = await User.find({ role: { $ne: 'PATIENT' } }).select('-passwordHash');
    return res.status(200).json(staff);
  } catch (error: any) {
    console.error('Get all staff error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
