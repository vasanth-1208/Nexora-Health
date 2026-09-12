import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User, Patient, PatientTimeline, getNextSequence } from '../models';
import { PatientTimelineService } from '../services/patientTimelineService';

// Format DOB as DDMMYYYY for initial password
const formatDOBForPassword = (dobString: string | Date): string => {
  const dob = new Date(dobString);
  const day = String(dob.getDate()).padStart(2, '0');
  const month = String(dob.getMonth() + 1).padStart(2, '0');
  const year = dob.getFullYear();
  return `${day}${month}${year}`;
};

export const registerPatient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      dob,
      gender,
      phone,
      email,
      address,
      emergencyContact,
      bloodGroup,
      medicalHistory,
      allergies,
      foodPreference,
      maritalStatus,
      alternatePhone,
      identificationType,
      identificationNumber,
      occupation,
      ongoingMedications,
      insuranceProvider,
      insurancePolicyNumber,
    } = req.body;

    if (!name || !dob || !gender || !emergencyContact || !emergencyContact.name || !emergencyContact.phone || !emergencyContact.relationship) {
      return res.status(400).json({ message: 'Missing required patient information.' });
    }

    // Atomically generate unique sequential Patient ID (e.g. P1002) - zero concurrency collision
    const seq = await getNextSequence('patientId', 1000);
    const patientId = `P${seq}`;

    // Hash the initial DOB-based password
    const rawDobPassword = formatDOBForPassword(dob);
    const passwordHash = await bcrypt.hash(rawDobPassword, 10);

    // Create User record
    const user = await User.create({
      username: patientId,
      passwordHash,
      role: 'PATIENT',
      name,
      email,
      phone,
    });

    // Create Patient profile
    const patient = await Patient.create({
      userId: user._id,
      patientId,
      dob: new Date(dob),
      gender,
      address,
      emergencyContact,
      bloodGroup,
      medicalHistory: medicalHistory || '',
      allergies: allergies || '',
      foodPreference: foodPreference || 'NORMAL',
      maritalStatus,
      alternatePhone,
      identificationType,
      identificationNumber,
      occupation,
      ongoingMedications,
      insuranceProvider,
      insurancePolicyNumber,
      assignedDoctors: [],
    });

    // Create timeline event
    const operatorName = (req as any).user?.name || 'Reception Staff';
    await PatientTimelineService.logEvent(
      patient._id,
      'REGISTRATION',
      `Patient registered with ID ${patientId}. Initial password set as DOB (DDMMYYYY).`,
      operatorName
    );

    return res.status(201).json({
      message: 'Patient registered successfully.',
      patientId,
      patient,
    });
  } catch (error: any) {
    console.error('Register patient error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const searchPatients = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(String(query), 'i');

    // Find in users collection (for names)
    const users = await User.find({
      $or: [
        { name: regex },
        { username: regex },
        { phone: regex }
      ],
      role: 'PATIENT'
    });

    const userIds = users.map(u => u._id);

    // Find patients matching userIds or custom patientId
    const patients = await Patient.find({
      $or: [
        { userId: { $in: userIds } },
        { patientId: regex }
      ]
    })
      .populate('userId', 'name email phone')
      .populate({
        path: 'currentAdmissionId',
        populate: [
          { path: 'wardId', populate: { path: 'departmentId' } },
          { path: 'bedId' },
          { path: 'doctorId', populate: { path: 'userId', select: 'name' } }
        ]
      });

    return res.status(200).json(patients);
  } catch (error: any) {
    console.error('Search patients error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Can be patientId or mongoose _id

    let query: any = { _id: id };
    if (id.startsWith('P') && !isNaN(Number(id.substring(1)))) {
      query = { patientId: id };
    }

    const patient = await Patient.findOne(query)
      .populate('userId', 'name email phone')
      .populate({
        path: 'assignedDoctors',
        populate: { path: 'userId', select: 'name' }
      })
      .populate({
        path: 'currentAdmissionId',
        populate: [
          { path: 'wardId', populate: { path: 'departmentId' } },
          { path: 'bedId' },
          { path: 'doctorId', populate: { path: 'userId', select: 'name' } }
        ]
      });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    return res.status(200).json(patient);
  } catch (error: any) {
    console.error('Get patient error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getAllPatients = async (req: Request, res: Response) => {
  try {
    const patients = await Patient.find({})
      .populate('userId', 'name email phone')
      .populate({
        path: 'currentAdmissionId',
        populate: [
          { path: 'wardId', populate: { path: 'departmentId' } },
          { path: 'bedId' },
          { path: 'doctorId', populate: { path: 'userId', select: 'name' } }
        ]
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(patients);
  } catch (error: any) {
    console.error('Get all patients error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getPatientTimeline = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params; // DB Patient _id
    const timeline = await PatientTimeline.find({ patientId }).sort({ timestamp: 1 });
    return res.status(200).json(timeline);
  } catch (error: any) {
    console.error('Get patient timeline error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getAllTimelineEvents = async (req: Request, res: Response) => {
  try {
    const timeline = await PatientTimeline.find({})
      .populate('patientId')
      .sort({ timestamp: -1 })
      .limit(100);
    return res.status(200).json(timeline);
  } catch (error: any) {
    console.error('Get all timeline error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const selfRegisterPatient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      dob,
      gender,
      phone,
      email,
      address,
      emergencyContact,
      bloodGroup,
      medicalHistory,
      allergies,
      maritalStatus,
      alternatePhone,
      identificationType,
      identificationNumber,
      occupation,
      ongoingMedications,
      insuranceProvider,
      insurancePolicyNumber,
    } = req.body;

    if (!name || !dob || !gender || !emergencyContact || !emergencyContact.name || !emergencyContact.phone || !emergencyContact.relationship) {
      return res.status(400).json({ message: 'Missing required patient information.' });
    }

    // Atomically generate unique sequential Patient ID
    const seq = await getNextSequence('patientId', 1000);
    const patientId = `P${seq}`;

    const rawDobPassword = formatDOBForPassword(dob);
    const passwordHash = await bcrypt.hash(rawDobPassword, 10);

    const user = await User.create({
      username: patientId,
      passwordHash,
      role: 'PATIENT',
      name,
      email,
      phone,
    });

    const patient = await Patient.create({
      userId: user._id,
      patientId,
      dob: new Date(dob),
      gender,
      address,
      emergencyContact,
      bloodGroup,
      medicalHistory: medicalHistory || '',
      allergies: allergies || '',
      maritalStatus,
      alternatePhone,
      identificationType,
      identificationNumber,
      occupation,
      ongoingMedications,
      insuranceProvider,
      insurancePolicyNumber,
      assignedDoctors: [],
    });

    await PatientTimelineService.logEvent(
      patient._id,
      'REGISTRATION',
      `Patient self-registered with ID ${patientId}. Initial password set as DOB (DDMMYYYY).`,
      'Self Registered'
    );

    return res.status(201).json({
      message: 'Patient registered successfully.',
      patientId,
      patient,
    });
  } catch (error: any) {
    console.error('Self register patient error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
