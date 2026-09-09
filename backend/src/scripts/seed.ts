import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import {
  User,
  Patient,
  Doctor,
  Department,
  Block,
  Floor,
  Ward,
  BedSet,
  Bed,
  PatientTimeline,
} from '../models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora_health';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected. Clearing existing collections...');

    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Block.deleteMany({});
    await Floor.deleteMany({});
    await Ward.deleteMany({});
    await BedSet.deleteMany({});
    await Bed.deleteMany({});
    await PatientTimeline.deleteMany({});
    
    // We can also clear other operational collections if needed
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (['consultations', 'doctorreferrals', 'admissions', 'wardchangerequests', 'diagnosticrequests', 'prescriptions', 'pharmacyqueues', 'payments', 'emergencyalerts', 'notifications'].includes(key)) {
        await collections[key].deleteMany({});
      }
    }

    console.log('Password hashing initialization...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const receptionHash = await bcrypt.hash('reception123', 10);
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const nurseHash = await bcrypt.hash('nurse123', 10);
    const wardHash = await bcrypt.hash('ward123', 10);
    const diagHash = await bcrypt.hash('diagnostics123', 10);
    const pharmHash = await bcrypt.hash('pharmacy123', 10);
    const billHash = await bcrypt.hash('billing123', 10);
    const patientHash = await bcrypt.hash('12051990', 10); // DOB: 12/05/1990 -> DDMMYYYY

    // 1. Create Core Users
    console.log('Creating users...');
    const adminUser = await User.create({
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      name: 'System Admin',
      email: 'admin@nexora.com',
      phone: '9876543210',
    });

    const receptionUser = await User.create({
      username: 'reception',
      passwordHash: receptionHash,
      role: 'RECEPTION',
      name: 'Sarah Jenkins',
      email: 'sarah.j@nexora.com',
      phone: '9876543211',
    });

    const doctorUser1 = await User.create({
      username: 'doctor1',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      name: 'Dr. John Smith',
      email: 'john.smith@nexora.com',
      phone: '9876543212',
    });

    const doctorUser2 = await User.create({
      username: 'doctor2',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      name: 'Dr. Sarah Connor',
      email: 'sarah.c@nexora.com',
      phone: '9876543213',
    });

    const doctorUser3 = await User.create({
      username: 'doctor3',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      name: 'Dr. David Tennant',
      email: 'david.t@nexora.com',
      phone: '9876543214',
    });

    const nurseUser = await User.create({
      username: 'nurse',
      passwordHash: nurseHash,
      role: 'NURSE',
      name: 'Mary Jane',
      email: 'mary.j@nexora.com',
      phone: '9876543215',
    });

    const wardUser = await User.create({
      username: 'ward',
      passwordHash: wardHash,
      role: 'WARD_STAFF',
      name: 'Alice Cooper',
      email: 'alice.c@nexora.com',
      phone: '9876543216',
    });

    const diagUser = await User.create({
      username: 'diagnostics',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'ALL',
      name: 'Bob Ross',
      email: 'bob.r@nexora.com',
      phone: '9876543217',
    });

    await User.create({
      username: 'xray',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'XRAY',
      name: 'X-Ray Lab Desk',
      email: 'xray@nexora.com',
      phone: '9876543230',
    });

    await User.create({
      username: 'ctscan',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'CTSCAN',
      name: 'CT Scan Lab Desk',
      email: 'ctscan@nexora.com',
      phone: '9876543231',
    });

    await User.create({
      username: 'pathology',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'PATHOLOGY',
      name: 'Pathology & Blood Lab',
      email: 'pathology@nexora.com',
      phone: '9876543232',
    });

    await User.create({
      username: 'ecg',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'CARDIOLOGY',
      name: 'ECG & Cardiology Lab',
      email: 'ecg@nexora.com',
      phone: '9876543233',
    });

    const pharmUser = await User.create({
      username: 'pharmacy',
      passwordHash: pharmHash,
      role: 'PHARMACY',
      name: 'Charlie Brown',
      email: 'charlie.b@nexora.com',
      phone: '9876543218',
    });

    const billUser = await User.create({
      username: 'billing',
      passwordHash: billHash,
      role: 'BILLING',
      name: 'Diana Prince',
      email: 'diana.p@nexora.com',
      phone: '9876543219',
    });

    // 2. Create Departments
    console.log('Creating departments...');
    const deptGM = await Department.create({ name: 'General Medicine', code: 'GM' });
    const deptCardio = await Department.create({ name: 'Cardiology', code: 'CARD' });
    const deptOrtho = await Department.create({ name: 'Orthopedics', code: 'ORTH' });

    // 3. Create Doctor Profiles
    console.log('Creating doctor profiles...');
    const docSmith = await Doctor.create({
      userId: doctorUser1._id,
      employeeId: 'doctor1',
      departmentId: deptGM._id,
      specialization: 'Internal Medicine',
      isAvailable: true,
    });

    const docConnor = await Doctor.create({
      userId: doctorUser2._id,
      employeeId: 'doctor2',
      departmentId: deptCardio._id,
      specialization: 'Cardiovascular Surgery',
      isAvailable: true,
    });

    const docTennant = await Doctor.create({
      userId: doctorUser3._id,
      employeeId: 'doctor3',
      departmentId: deptOrtho._id,
      specialization: 'Orthopedic Trauma',
      isAvailable: true,
    });

    // 4. Create Hospital structure: Blocks, Floors, Wards, BedSets, Beds
    console.log('Creating hospital physical structures...');
    const blockA = await Block.create({ name: 'Block A' });
    const blockB = await Block.create({ name: 'Block B' });

    const floorA1 = await Floor.create({ name: 'Floor 1', blockId: blockA._id });
    const floorA2 = await Floor.create({ name: 'Floor 2', blockId: blockA._id });
    const floorB1 = await Floor.create({ name: 'Floor 1', blockId: blockB._id });

    // Wards
    const wardGMMale = await Ward.create({
      name: 'GM Male Ward',
      departmentId: deptGM._id,
      floorId: floorA1._id,
      gender: 'MALE',
    });

    const wardGMFemale = await Ward.create({
      name: 'GM Female Ward',
      departmentId: deptGM._id,
      floorId: floorA1._id,
      gender: 'FEMALE',
    });

    const wardCardioICU = await Ward.create({
      name: 'Cardiology ICU',
      departmentId: deptCardio._id,
      floorId: floorA2._id,
      gender: 'GENERAL',
    });

    const wardOrthoGen = await Ward.create({
      name: 'Orthopedics Ward',
      departmentId: deptOrtho._id,
      floorId: floorB1._id,
      gender: 'GENERAL',
    });

    // Bed Sets
    const setGMMaleA = await BedSet.create({ name: 'Male Set A', wardId: wardGMMale._id });
    const setGMMaleB = await BedSet.create({ name: 'Male Set B', wardId: wardGMMale._id });
    const setGMFemaleA = await BedSet.create({ name: 'Female Set A', wardId: wardGMFemale._id });
    const setCardioA = await BedSet.create({ name: 'ICU Set A', wardId: wardCardioICU._id });
    const setOrthoA = await BedSet.create({ name: 'Ortho Set A', wardId: wardOrthoGen._id });

    // Create 30+ Beds
    console.log('Generating beds...');
    const bedsData = [];

    // GM Male Ward Beds (10 beds)
    for (let i = 1; i <= 6; i++) {
      bedsData.push({ bedId: `GM-M-00${i}`, bedSetId: setGMMaleA._id, status: 'AVAILABLE' });
    }
    for (let i = 7; i <= 10; i++) {
      bedsData.push({ bedId: `GM-M-0${i}`, bedSetId: setGMMaleB._id, status: 'AVAILABLE' });
    }

    // GM Female Ward Beds (8 beds)
    for (let i = 1; i <= 8; i++) {
      bedsData.push({ bedId: `GM-F-00${i}`, bedSetId: setGMFemaleA._id, status: 'AVAILABLE' });
    }

    // Cardiology ICU Beds (6 beds)
    for (let i = 1; i <= 6; i++) {
      bedsData.push({
        bedId: `ICU-00${i}`,
        bedSetId: setCardioA._id,
        status: i === 6 ? 'MAINTENANCE' : 'AVAILABLE',
        maintenanceReason: i === 6 ? 'Oxygen unit repair' : undefined,
      });
    }

    // Orthopedics Ward Beds (8 beds)
    for (let i = 1; i <= 8; i++) {
      bedsData.push({ bedId: `ORTH-00${i}`, bedSetId: setOrthoA._id, status: 'AVAILABLE' });
    }

    await Bed.insertMany(bedsData);
    console.log(`Generated ${bedsData.length} beds.`);

    // 5. Create Sample Patient
    console.log('Creating sample patient P1001...');
    const patientUser = await User.create({
      username: 'P1001',
      passwordHash: patientHash,
      role: 'PATIENT',
      name: 'John Doe',
      email: 'johndoe@gmail.com',
      phone: '9988776655',
    });

    const samplePatient = await Patient.create({
      userId: patientUser._id,
      patientId: 'P1001',
      dob: new Date('1990-05-12'),
      gender: 'MALE',
      address: '123 Bakers Street, London',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '9988776600',
        relationship: 'Spouse',
      },
      bloodGroup: 'O+',
      medicalHistory: 'Mild asthma, hypertension managed by diet.',
      allergies: 'Penicillin, Dust mites',
      foodPreference: 'VEGETARIAN',
      assignedDoctors: [docSmith._id],
    });

    // Create Initial Timeline for P1001
    await PatientTimeline.create({
      patientId: samplePatient._id,
      eventType: 'REGISTRATION',
      description: 'Patient account created in system.',
      createdBy: 'Sarah Jenkins (Reception)',
      timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    });

    await PatientTimeline.create({
      patientId: samplePatient._id,
      eventType: 'DOCTOR_ASSIGNMENT',
      description: 'Assigned to Dr. John Smith (General Medicine) for primary consult.',
      createdBy: 'Sarah Jenkins (Reception)',
      timestamp: new Date(Date.now() - 3600000 * 1.8), // ~1.8 hours ago
    });

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
