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
  Consultation,
  Admission,
  DiagnosticRequest,
  Prescription,
  Payment,
  Invoice,
  MedicineInventory,
} from '../models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora_health';

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('FATAL: Database seeding is prohibited in production environment without explicit flag.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully. Purging existing collections to eliminate foreign/stale sample records...');

    // Clear operational collections
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
    await Consultation.deleteMany({});
    await Admission.deleteMany({});
    await DiagnosticRequest.deleteMany({});
    await Prescription.deleteMany({});
    await Payment.deleteMany({});
    await Invoice.deleteMany({});
    await MedicineInventory.deleteMany({});

    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (['doctorreferrals', 'wardchangerequests', 'pharmacyqueues', 'emergencyalerts', 'notifications', 'counters'].includes(key)) {
        await collections[key].deleteMany({});
      }
    }

    console.log('Generating bcrypt password hashes...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const receptionHash = await bcrypt.hash('reception123', 10);
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const nurseHash = await bcrypt.hash('nurse123', 10);
    const wardHash = await bcrypt.hash('ward123', 10);
    const diagHash = await bcrypt.hash('Password@123', 10);
    const pharmHash = await bcrypt.hash('pharmacy123', 10);
    const billHash = await bcrypt.hash('billing123', 10);

    // 1. Create Core Tamil Nadu Clinical & Administrative Users
    console.log('Creating Tamil Nadu Hospital Staff Accounts...');
    const adminUser = await User.create({
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      name: 'Dr. K. Senthil Nathan',
      email: 'senthil.nathan@nexora.in',
      phone: '9840123450',
    });

    const receptionUser = await User.create({
      username: 'reception',
      passwordHash: receptionHash,
      role: 'RECEPTION',
      name: 'P. Malarvizhi',
      email: 'malarvizhi.p@nexora.in',
      phone: '9840123451',
    });

    const doctorUser1 = await User.create({
      username: 'doctor1',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      name: 'Dr. S. Karthikeyan',
      email: 'karthikeyan.s@nexora.in',
      phone: '9840123452',
    });

    const doctorUser2 = await User.create({
      username: 'doctor2',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      name: 'Dr. Meenakshi Sundaram',
      email: 'meenakshi.s@nexora.in',
      phone: '9840123453',
    });

    const doctorUser3 = await User.create({
      username: 'doctor3',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      name: 'Dr. R. Vigneshwaran',
      email: 'vigneshwaran.r@nexora.in',
      phone: '9840123454',
    });

    const nurseUser = await User.create({
      username: 'nurse',
      passwordHash: nurseHash,
      role: 'NURSE',
      name: 'Vimala Devi M.',
      email: 'vimala.devi@nexora.in',
      phone: '9840123455',
    });

    const wardUser = await User.create({
      username: 'ward',
      passwordHash: wardHash,
      role: 'WARD_STAFF',
      name: 'S. Arumugam',
      email: 'arumugam.s@nexora.in',
      phone: '9840123456',
    });

    // Diagnostic Modality Accounts
    await User.create({
      username: 'diagnostics',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'ALL',
      name: 'M. Balasubramanian (Chief Lab Supervisor)',
      email: 'bala.subramanian@nexora.in',
      phone: '9840123457',
    });

    await User.create({
      username: 'xray',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'XRAY',
      name: 'X-Ray Imaging Desk (K. Selvaraj)',
      email: 'xray@nexora.in',
      phone: '9840123460',
    });

    await User.create({
      username: 'ctscan',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'CTSCAN',
      name: 'CT Scan Specialist Desk (R. Anand)',
      email: 'ctscan@nexora.in',
      phone: '9840123461',
    });

    await User.create({
      username: 'pathology',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'PATHOLOGY',
      name: 'Pathology & Blood Lab (Dr. Kavitha S.)',
      email: 'pathology@nexora.in',
      phone: '9840123462',
    });

    await User.create({
      username: 'ecg',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'CARDIOLOGY',
      name: 'Cardiology & ECG Lab Desk (T. Shanthi)',
      email: 'ecg@nexora.in',
      phone: '9840123463',
    });

    await User.create({
      username: 'mri',
      passwordHash: diagHash,
      role: 'DIAGNOSTICS',
      labType: 'MRI',
      name: 'MRI Scan Suite Desk (M. Saravanan)',
      email: 'mri@nexora.in',
      phone: '9840123464',
    });

    const pharmUser = await User.create({
      username: 'pharmacy',
      passwordHash: pharmHash,
      role: 'PHARMACY',
      name: 'G. Muthukumar',
      email: 'muthukumar.g@nexora.in',
      phone: '9840123458',
    });

    const billUser = await User.create({
      username: 'billing',
      passwordHash: billHash,
      role: 'BILLING',
      name: 'K. Vijayalakshmi',
      email: 'vijayalakshmi.k@nexora.in',
      phone: '9840123459',
    });

    // 2. Create Departments
    console.log('Creating clinical departments...');
    const deptGM = await Department.create({ name: 'General Medicine', code: 'GM' });
    const deptCardio = await Department.create({ name: 'Cardiology', code: 'CARD' });
    const deptOrtho = await Department.create({ name: 'Orthopedics', code: 'ORTH' });

    // 3. Create Doctor Profiles
    console.log('Creating doctor profiles for Dr. S. Karthikeyan, Dr. Meenakshi Sundaram & Dr. R. Vigneshwaran...');
    const docKarthik = await Doctor.create({
      userId: doctorUser1._id,
      employeeId: 'DOC-TN-01',
      departmentId: deptGM._id,
      specialization: 'General & Internal Medicine',
      isAvailable: true,
    });

    const docMeenakshi = await Doctor.create({
      userId: doctorUser2._id,
      employeeId: 'DOC-TN-02',
      departmentId: deptCardio._id,
      specialization: 'Cardiovascular Surgery',
      isAvailable: true,
    });

    const docVignesh = await Doctor.create({
      userId: doctorUser3._id,
      employeeId: 'DOC-TN-03',
      departmentId: deptOrtho._id,
      specialization: 'Orthopedic & Trauma Surgery',
      isAvailable: true,
    });

    // 4. Physical Hospital Layout (Blocks, Floors, Wards, BedSets, Beds)
    console.log('Setting up hospital blocks, floors and wards...');
    const blockA = await Block.create({ name: 'Block A (Kamarajar Block)' });
    const blockB = await Block.create({ name: 'Block B (Thiruvalluvar Tower)' });

    const floorA1 = await Floor.create({ name: 'Floor 1', blockId: blockA._id });
    const floorA2 = await Floor.create({ name: 'Floor 2', blockId: blockA._id });
    const floorB1 = await Floor.create({ name: 'Floor 1', blockId: blockB._id });

    // Wards
    const wardGMMale = await Ward.create({
      name: 'GM Male General Ward',
      departmentId: deptGM._id,
      floorId: floorA1._id,
      gender: 'MALE',
      type: 'GENERAL',
      dailyRate: 800,
      capacity: 10,
    });

    const wardGMFemale = await Ward.create({
      name: 'GM Female General Ward',
      departmentId: deptGM._id,
      floorId: floorA1._id,
      gender: 'FEMALE',
      type: 'GENERAL',
      dailyRate: 800,
      capacity: 8,
    });

    const wardCardioICU = await Ward.create({
      name: 'Cardiology Intensive Care Unit (CCU)',
      departmentId: deptCardio._id,
      floorId: floorA2._id,
      gender: 'GENERAL',
      type: 'ICU',
      dailyRate: 3500,
      capacity: 6,
    });

    const wardCardioGen = await Ward.create({
      name: 'Cardiology General Inpatient Ward',
      departmentId: deptCardio._id,
      floorId: floorA2._id,
      gender: 'GENERAL',
      type: 'SEMI_PRIVATE',
      dailyRate: 1500,
      capacity: 6,
    });

    const wardOrthoGen = await Ward.create({
      name: 'Orthopedics & Post-Op Recovery Ward',
      departmentId: deptOrtho._id,
      floorId: floorB1._id,
      gender: 'GENERAL',
      type: 'GENERAL',
      dailyRate: 1000,
      capacity: 8,
    });

    // Bed Sets
    const setGMMale = await BedSet.create({ name: 'GM Male Bay A', wardId: wardGMMale._id });
    const setGMFemale = await BedSet.create({ name: 'GM Female Bay A', wardId: wardGMFemale._id });
    const setCardioICU = await BedSet.create({ name: 'CCU Critical Bay', wardId: wardCardioICU._id });
    const setCardioGen = await BedSet.create({ name: 'Cardio Inpatient Bay', wardId: wardCardioGen._id });
    const setOrtho = await BedSet.create({ name: 'Ortho Recovery Bay', wardId: wardOrthoGen._id });

    // Generate 32 Beds
    console.log('Generating hospital beds...');
    const beds = [];

    // GM Male Beds (10)
    for (let i = 1; i <= 10; i++) {
      const code = i < 10 ? `GM-M-00${i}` : `GM-M-0${i}`;
      beds.push({ bedId: code, bedSetId: setGMMale._id, status: 'AVAILABLE' });
    }

    // GM Female Beds (8)
    for (let i = 1; i <= 8; i++) {
      beds.push({ bedId: `GM-F-00${i}`, bedSetId: setGMFemale._id, status: 'AVAILABLE' });
    }

    // CCU Beds (6)
    for (let i = 1; i <= 6; i++) {
      beds.push({
        bedId: `CCU-00${i}`,
        bedSetId: setCardioICU._id,
        status: i === 6 ? 'MAINTENANCE' : 'AVAILABLE',
        maintenanceReason: i === 6 ? 'Scheduled biomedical ventilator calibration' : undefined,
      });
    }

    // Orthopedics Beds (8)
    for (let i = 1; i <= 8; i++) {
      beds.push({ bedId: `ORTH-00${i}`, bedSetId: setOrtho._id, status: 'AVAILABLE' });
    }

    const createdBeds = await Bed.insertMany(beds);
    console.log(`Successfully generated ${createdBeds.length} physical beds across all wards.`);

    // 5. Create 5 Authentic Tamil Nadu Patients
    console.log('Registering Tamil Nadu Patients (Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem)...');
    
    // Patient 1: Murugan K. (Chennai) - Outpatient consult & check-in
    const userP1 = await User.create({
      username: 'P1001',
      passwordHash: await bcrypt.hash('12051990', 10),
      role: 'PATIENT',
      name: 'Murugan K.',
      email: 'murugan.k@gmail.com',
      phone: '9841023411',
    });

    const patient1 = await Patient.create({
      userId: userP1._id,
      patientId: 'P1001',
      dob: new Date('1990-05-12'),
      gender: 'MALE',
      address: '45/2, Anna Salai, T. Nagar, Chennai - 600017',
      emergencyContact: {
        name: 'Valli Murugan',
        phone: '9841023412',
        relationship: 'Spouse',
      },
      bloodGroup: 'O+',
      medicalHistory: 'Type 2 Diabetes, Mild hypertension managed with diet and oral medications.',
      allergies: 'Penicillin',
      foodPreference: 'VEGETARIAN',
      assignedDoctors: [docKarthik._id],
    });

    // Patient 2: Selvam R. (Coimbatore) - Inpatient in CCU
    const userP2 = await User.create({
      username: 'P1002',
      passwordHash: await bcrypt.hash('25081985', 10),
      role: 'PATIENT',
      name: 'Selvam R.',
      email: 'selvam.r@gmail.com',
      phone: '9842034522',
    });

    const patient2 = await Patient.create({
      userId: userP2._id,
      patientId: 'P1002',
      dob: new Date('1985-08-25'),
      gender: 'MALE',
      address: '12, Cross Cut Road, Gandhipuram, Coimbatore - 641012',
      emergencyContact: {
        name: 'Priya Selvam',
        phone: '9842034523',
        relationship: 'Spouse',
      },
      bloodGroup: 'B+',
      medicalHistory: 'Acute coronary syndrome, Unstable Angina. Under post-angioplasty ICU monitoring.',
      allergies: 'Sulfa antibiotics',
      foodPreference: 'NON_VEGETARIAN',
      assignedDoctors: [docMeenakshi._id],
    });

    // Patient 3: Kavitha S. (Madurai) - Inpatient in Orthopedics
    const userP3 = await User.create({
      username: 'P1003',
      passwordHash: await bcrypt.hash('14021995', 10),
      role: 'PATIENT',
      name: 'Kavitha S.',
      email: 'kavitha.s@gmail.com',
      phone: '9843045633',
    });

    const patient3 = await Patient.create({
      userId: userP3._id,
      patientId: 'P1003',
      dob: new Date('1995-02-14'),
      gender: 'FEMALE',
      address: '78, West Car Street, Madurai - 625001',
      emergencyContact: {
        name: 'Sundar Raj',
        phone: '9843045634',
        relationship: 'Father',
      },
      bloodGroup: 'A+',
      medicalHistory: 'Right femur distal hairline fracture post road-traffic fall.',
      allergies: 'No known drug allergies',
      foodPreference: 'VEGETARIAN',
      assignedDoctors: [docVignesh._id],
    });

    // Patient 4: Lakshmi Narayanan M. (Tiruchirappalli) - Waiting in Queue
    const userP4 = await User.create({
      username: 'P1004',
      passwordHash: await bcrypt.hash('03111978', 10),
      role: 'PATIENT',
      name: 'Lakshmi Narayanan M.',
      email: 'lakshmi.narayanan@gmail.com',
      phone: '9844056744',
    });

    const patient4 = await Patient.create({
      userId: userP4._id,
      patientId: 'P1004',
      dob: new Date('1978-11-03'),
      gender: 'MALE',
      address: '23, Thillai Nagar 5th Cross, Tiruchirappalli - 620018',
      emergencyContact: {
        name: 'Radha Narayanan',
        phone: '9844056745',
        relationship: 'Spouse',
      },
      bloodGroup: 'AB+',
      medicalHistory: 'Chronic kidney disease Stage 2, Bronchial Asthma.',
      allergies: 'NSAIDs, Aspirin',
      foodPreference: 'VEGETARIAN',
      assignedDoctors: [docKarthik._id],
    });

    // Patient 5: Deepa S. (Salem) - Outpatient visit completed
    const userP5 = await User.create({
      username: 'P1005',
      passwordHash: await bcrypt.hash('19072001', 10),
      role: 'PATIENT',
      name: 'Deepa S.',
      email: 'deepa.sundar@gmail.com',
      phone: '9845067855',
    });

    const patient5 = await Patient.create({
      userId: userP5._id,
      patientId: 'P1005',
      dob: new Date('2001-07-19'),
      gender: 'FEMALE',
      address: '88, Meyyanur Main Road, Salem - 636004',
      emergencyContact: {
        name: 'Saraswathi S.',
        phone: '9845067856',
        relationship: 'Mother',
      },
      bloodGroup: 'O-',
      medicalHistory: 'Acute viral bronchitis with dry cough and mild febrile episodes.',
      allergies: 'None',
      foodPreference: 'NON_VEGETARIAN',
      assignedDoctors: [docKarthik._id],
    });

    // 6. Setup Inpatient Admissions for P1002 (CCU) and P1003 (Orthopedics)
    console.log('Configuring active inpatient admissions and assigning beds...');
    const bedCCU1 = await Bed.findOne({ bedId: 'CCU-001' });
    const bedOrtho1 = await Bed.findOne({ bedId: 'ORTH-001' });

    // Admission for Selvam R. (CCU)
    const admissionP2 = await Admission.create({
      patientId: patient2._id,
      doctorId: docMeenakshi._id,
      wardId: wardCardioICU._id,
      bedId: bedCCU1?._id,
      admissionStatus: 'OCCUPIED',
      paymentStatus: 'PAID',
      admittedAt: new Date(Date.now() - 48 * 3600 * 1000), // Admitted 2 days ago
    });

    if (bedCCU1) {
      bedCCU1.status = 'OCCUPIED';
      bedCCU1.currentPatientId = patient2._id as any;
      bedCCU1.currentAdmissionId = admissionP2._id as any;
      bedCCU1.occupiedTime = admissionP2.admittedAt;
      await bedCCU1.save();
    }
    patient2.currentAdmissionId = admissionP2._id as any;
    await patient2.save();

    // Admission for Kavitha S. (Orthopedics)
    const admissionP3 = await Admission.create({
      patientId: patient3._id,
      doctorId: docVignesh._id,
      wardId: wardOrthoGen._id,
      bedId: bedOrtho1?._id,
      admissionStatus: 'OCCUPIED',
      paymentStatus: 'PAID',
      admittedAt: new Date(Date.now() - 24 * 3600 * 1000), // Admitted 1 day ago
    });

    if (bedOrtho1) {
      bedOrtho1.status = 'OCCUPIED';
      bedOrtho1.currentPatientId = patient3._id as any;
      bedOrtho1.currentAdmissionId = admissionP3._id as any;
      bedOrtho1.occupiedTime = admissionP3.admittedAt;
      await bedOrtho1.save();
    }
    patient3.currentAdmissionId = admissionP3._id as any;
    await patient3.save();

    // 7. Create Indian Medicine Catalog (MedicineInventory)
    console.log('Stocking hospital pharmacy with Indian pharmaceutical catalog...');
    const medicinesCatalog = [
      { name: 'Dolo 650 (Paracetamol 650mg)', category: 'Antipyretic / Analgesic', dosageForm: 'Tablet', stockQuantity: 500, unitPrice: 3.5, reorderLevel: 50, batchNumber: 'DOL-2026-TN' },
      { name: 'Glycomet 500 (Metformin 500mg)', category: 'Antidiabetic', dosageForm: 'Tablet', stockQuantity: 350, unitPrice: 4.0, reorderLevel: 40, batchNumber: 'GLY-2026-TN' },
      { name: 'Telma 40 (Telmisartan 40mg)', category: 'Antihypertensive', dosageForm: 'Tablet', stockQuantity: 280, unitPrice: 8.5, reorderLevel: 30, batchNumber: 'TEL-2026-TN' },
      { name: 'Atorva 20 (Atorvastatin 20mg)', category: 'Cardiovascular / Statin', dosageForm: 'Tablet', stockQuantity: 240, unitPrice: 12.0, reorderLevel: 30, batchNumber: 'ATO-2026-TN' },
      { name: 'Pan 40 (Pantoprazole 40mg)', category: 'Gastrointestinal / PPI', dosageForm: 'Tablet', stockQuantity: 400, unitPrice: 9.0, reorderLevel: 40, batchNumber: 'PAN-2026-TN' },
      { name: 'Azee 500 (Azithromycin 500mg)', category: 'Antibiotic', dosageForm: 'Tablet', stockQuantity: 180, unitPrice: 22.0, reorderLevel: 25, batchNumber: 'AZE-2026-TN' },
      { name: 'Augmentin 625 (Amoxicillin + Clavulanic Acid)', category: 'Antibiotic', dosageForm: 'Tablet', stockQuantity: 150, unitPrice: 26.5, reorderLevel: 20, batchNumber: 'AUG-2026-TN' },
      { name: 'Voveran 50 (Diclofenac 50mg)', category: 'NSAID / Pain Relief', dosageForm: 'Tablet', stockQuantity: 300, unitPrice: 5.5, reorderLevel: 35, batchNumber: 'VOV-2026-TN' },
      { name: 'Cetirizine 10mg', category: 'Antihistamine / Allergy', dosageForm: 'Tablet', stockQuantity: 450, unitPrice: 2.5, reorderLevel: 50, batchNumber: 'CET-2026-TN' },
      { name: 'Emeset 4mg (Ondansetron)', category: 'Antiemetic', dosageForm: 'Tablet', stockQuantity: 200, unitPrice: 6.0, reorderLevel: 25, batchNumber: 'EME-2026-TN' },
      { name: 'Lantus 100IU/ml (Insulin Glargine)', category: 'Insulin Analog', dosageForm: 'Injection', stockQuantity: 80, unitPrice: 480.0, reorderLevel: 15, batchNumber: 'LAN-2026-TN' },
    ];

    await MedicineInventory.insertMany(medicinesCatalog);

    // 8. Create Consultations & Vitals
    console.log('Seeding clinical consultation queues and triage vitals...');
    // Consultation 1: Murugan K. with Dr. Karthikeyan (WITH_DOCTOR)
    const consult1 = await Consultation.create({
      patientId: patient1._id,
      doctorId: docKarthik._id,
      status: 'WITH_DOCTOR',
      paymentStatus: 'PAID',
      vitals: {
        bloodPressure: '130/84',
        heartRate: 76,
        temperature: 98.6,
        spO2: 99,
        respiratoryRate: 16,
        weight: 72,
        triagePriority: 'ROUTINE',
        nursingNotes: 'Patient arrived with mild persistent cough and requested routine diabetic follow-up.',
        recordedBy: 'Vimala Devi M. (Staff Nurse)',
        recordedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      clinicalNotes: 'Chest clear. Fasting blood sugar target 110 mg/dL maintained. Prescribed standard 3-day course.',
    });

    // Consultation 2: Lakshmi Narayanan M. (WAITING)
    await Consultation.create({
      patientId: patient4._id,
      doctorId: docKarthik._id,
      status: 'WAITING',
      paymentStatus: 'PAID',
      vitals: {
        bloodPressure: '144/92',
        heartRate: 88,
        temperature: 99.2,
        spO2: 96,
        respiratoryRate: 20,
        weight: 68,
        triagePriority: 'URGENT',
        nursingNotes: 'Shortness of breath on exertion. Wheezing audible on intake.',
        recordedBy: 'Vimala Devi M. (Staff Nurse)',
        recordedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });

    // Consultation 3: Deepa S. (COMPLETED)
    await Consultation.create({
      patientId: patient5._id,
      doctorId: docKarthik._id,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      vitals: {
        bloodPressure: '118/76',
        heartRate: 78,
        temperature: 98.4,
        spO2: 99,
        respiratoryRate: 15,
        weight: 54,
        triagePriority: 'ROUTINE',
        nursingNotes: 'Post-viral recovery consultation. Normal vitals.',
        recordedBy: 'Vimala Devi M. (Staff Nurse)',
        recordedAt: new Date(Date.now() - 3 * 3600 * 1000),
      },
      clinicalNotes: 'Throat congestion resolved. Lungs clear. Advised hydration and complete 5-day antibiotic course.',
    });

    // 9. Create Diagnostic Orders & Results
    console.log('Seeding diagnostic scans and lab reports...');
    // Murugan K.: Chest X-Ray (COMPLETED)
    await DiagnosticRequest.create({
      patientId: patient1._id,
      doctorId: docKarthik._id,
      testType: 'Chest X-Ray PA View',
      modality: 'XRAY',
      priority: 'ROUTINE',
      status: 'COMPLETED',
      cost: 450,
      technician: 'K. Selvaraj (Radiographer)',
      findings: 'Bilateral lung fields normal. Cardiac shadow normal in size and configuration. Costophrenic angles clear.',
      impression: 'Normal Chest Radiograph.',
      completionTime: new Date(Date.now() - 20 * 60 * 1000),
    });

    // Selvam R.: 12-Lead ECG (COMPLETED)
    await DiagnosticRequest.create({
      patientId: patient2._id,
      doctorId: docMeenakshi._id,
      testType: '12-Lead Electrocardiogram (ECG)',
      modality: 'CARDIOLOGY',
      priority: 'EMERGENCY',
      status: 'COMPLETED',
      cost: 350,
      technician: 'T. Shanthi (Cardiology Tech)',
      findings: 'Sinus rhythm with mild ST depression in leads V4-V6. Heart rate 82 bpm.',
      impression: 'Resolving subendocardial ischemia under CCU monitoring.',
      completionTime: new Date(Date.now() - 36 * 3600 * 1000),
    });

    // Selvam R.: 2D Echocardiogram (IN_PROGRESS)
    await DiagnosticRequest.create({
      patientId: patient2._id,
      doctorId: docMeenakshi._id,
      testType: '2D Echocardiogram with Color Doppler',
      modality: 'CARDIOLOGY',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      cost: 1800,
      technician: 'T. Shanthi (Cardiology Tech)',
      notes: 'Evaluate ejection fraction and regional wall motion abnormalities.',
    });

    // Kavitha S.: CT Pelvis & Femur (COMPLETED)
    await DiagnosticRequest.create({
      patientId: patient3._id,
      doctorId: docVignesh._id,
      testType: 'CT Scan - Right Femur & Pelvis',
      modality: 'CTSCAN',
      priority: 'URGENT',
      status: 'COMPLETED',
      cost: 2500,
      technician: 'R. Anand (CT Tech)',
      findings: 'Hairline undisplaced fracture noted at distal femoral metaphysis. No intra-articular extension.',
      impression: 'Distal femur undisplaced hairline fracture suitable for conservative splinting and bed rest.',
      completionTime: new Date(Date.now() - 20 * 3600 * 1000),
    });

    // Lakshmi Narayanan M.: Complete Blood Count (QUEUED)
    await DiagnosticRequest.create({
      patientId: patient4._id,
      doctorId: docKarthik._id,
      testType: 'Complete Blood Count (CBC) with ESR',
      modality: 'PATHOLOGY',
      priority: 'URGENT',
      status: 'QUEUED',
      cost: 300,
      notes: 'Check WBC count and eosinophil levels for acute respiratory exacerbation.',
    });

    // 10. Create Prescriptions
    console.log('Seeding pharmacy prescriptions...');
    // Murugan K.
    await Prescription.create({
      patientId: patient1._id,
      doctorId: docKarthik._id,
      medicines: [
        { name: 'Dolo 650 (Paracetamol 650mg)', quantity: 6, status: 'DISPENSED', cost: 21, paymentStatus: 'PAID', days: 3, timing: '1-0-1 (Morning & Night)' },
        { name: 'Pan 40 (Pantoprazole 40mg)', quantity: 5, status: 'DISPENSED', cost: 45, paymentStatus: 'PAID', days: 5, timing: '1-0-0 (Before Food)' },
      ],
      totalCost: 66,
      paymentStatus: 'PAID',
    });

    // Selvam R.
    await Prescription.create({
      patientId: patient2._id,
      doctorId: docMeenakshi._id,
      medicines: [
        { name: 'Atorva 20 (Atorvastatin 20mg)', quantity: 15, status: 'DISPENSED', cost: 180, paymentStatus: 'PAID', days: 15, timing: '0-0-1 (Night After Food)' },
        { name: 'Telma 40 (Telmisartan 40mg)', quantity: 15, status: 'DISPENSED', cost: 127.5, paymentStatus: 'PAID', days: 15, timing: '1-0-0 (Morning)' },
      ],
      totalCost: 307.5,
      paymentStatus: 'PAID',
    });

    // Deepa S.
    await Prescription.create({
      patientId: patient5._id,
      doctorId: docKarthik._id,
      medicines: [
        { name: 'Azee 500 (Azithromycin 500mg)', quantity: 5, status: 'DISPENSED', cost: 110, paymentStatus: 'PAID', days: 5, timing: '1-0-0 (After Food)' },
        { name: 'Cetirizine 10mg', quantity: 5, status: 'DISPENSED', cost: 12.5, paymentStatus: 'PAID', days: 5, timing: '0-0-1 (Night)' },
      ],
      totalCost: 122.5,
      paymentStatus: 'PAID',
    });

    // 11. Create Itemized Invoices & Ledger Payments
    console.log('Generating clinical billing invoices and financial ledgers...');
    // Inpatient Invoice for Selvam R. (P1002) in CCU
    await Invoice.create({
      invoiceNumber: 'INV-2026-CCU-1002',
      patientId: patient2._id,
      admissionId: admissionP2._id,
      lineItems: [
        { description: 'Cardiology Intensive Care Unit (CCU) Stay (2 Days @ ₹3,500/day)', category: 'BED_STAY', quantity: 2, unitPrice: 3500, total: 7000 },
        { description: 'Cardiovascular Specialist Daily Rounds (Dr. Meenakshi Sundaram)', category: 'CONSULTATION', quantity: 2, unitPrice: 800, total: 1600 },
        { description: 'Emergency 12-Lead Electrocardiogram', category: 'DIAGNOSTIC', quantity: 1, unitPrice: 350, total: 350 },
        { description: '2D Echocardiogram with Color Doppler', category: 'DIAGNOSTIC', quantity: 1, unitPrice: 1800, total: 1800 },
        { description: 'Inpatient Cardiac Pharmacy Medications', category: 'PHARMACY', quantity: 1, unitPrice: 307.5, total: 307.5 },
      ],
      subtotal: 11057.5,
      taxRate: 5,
      taxAmount: 552.87,
      discount: 0,
      totalAmount: 11610,
      paidAmount: 5000, // Admission deposit paid
      balanceAmount: 6610,
      status: 'PARTIALLY_PAID',
      generatedBy: 'K. Vijayalakshmi (Senior Billing Officer)',
      notes: 'Initial admission deposit of ₹5,000 adjusted. Balance payable at time of final ward discharge.',
    });

    // Outpatient Consultation Payment for Murugan K. (P1001)
    const pay1 = await Payment.create({
      patientId: patient1._id,
      serviceType: 'CONSULTATION',
      amount: 500,
      status: 'PAID',
      paymentMethod: 'UPI',
      paidAt: new Date(Date.now() - 40 * 60 * 1000),
      processedBy: 'P. Malarvizhi (Reception)',
      description: 'Outpatient Consultation Fee with Dr. S. Karthikeyan',
    });

    // Diagnostic Payment for Murugan K. (P1001)
    await Payment.create({
      patientId: patient1._id,
      serviceType: 'DIAGNOSTIC',
      amount: 450,
      status: 'PAID',
      paymentMethod: 'UPI',
      paidAt: new Date(Date.now() - 25 * 60 * 1000),
      processedBy: 'K. Vijayalakshmi (Billing)',
      description: 'Chest X-Ray PA View Radiology Fee',
    });

    // Admission Deposit Payment for Selvam R. (P1002)
    await Payment.create({
      patientId: patient2._id,
      serviceType: 'ADMISSION',
      amount: 5000,
      status: 'PAID',
      paymentMethod: 'CARD',
      paidAt: new Date(Date.now() - 48 * 3600 * 1000),
      processedBy: 'K. Vijayalakshmi (Billing)',
      description: 'Initial Inpatient Admission Security Deposit - Cardiology CCU',
    });

    // Outpatient Payment for Deepa S. (P1005)
    await Payment.create({
      patientId: patient5._id,
      serviceType: 'CONSULTATION',
      amount: 500,
      status: 'PAID',
      paymentMethod: 'CASH',
      paidAt: new Date(Date.now() - 3.5 * 3600 * 1000),
      processedBy: 'P. Malarvizhi (Reception)',
      description: 'General Medicine Consultation Fee with Dr. S. Karthikeyan',
    });

    // 12. Create Patient Timeline Audit Events
    console.log('Generating clinical audit trail and timeline events...');
    // Timeline for Murugan K. (P1001)
    await PatientTimeline.create({
      patientId: patient1._id,
      eventType: 'REGISTRATION',
      description: 'Outpatient registered in Nexora Health system.',
      createdBy: 'P. Malarvizhi (Reception)',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
    });

    await PatientTimeline.create({
      patientId: patient1._id,
      eventType: 'DOCTOR_ASSIGNMENT',
      description: 'Assigned to Dr. S. Karthikeyan (General Medicine) for consultation.',
      createdBy: 'P. Malarvizhi (Reception)',
      timestamp: new Date(Date.now() - 42 * 60 * 1000),
    });

    await PatientTimeline.create({
      patientId: patient1._id,
      eventType: 'TRIAGE',
      description: 'Triage vitals recorded: BP 130/84, HR 76, Temp 98.6°F, SpO2 99%.',
      createdBy: 'Vimala Devi M. (Staff Nurse)',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
    });

    await PatientTimeline.create({
      patientId: patient1._id,
      eventType: 'DIAGNOSTICS',
      description: 'Chest X-Ray PA View completed. Radiograph reported as Normal.',
      createdBy: 'K. Selvaraj (Radiographer)',
      timestamp: new Date(Date.now() - 20 * 60 * 1000),
    });

    // Timeline for Selvam R. (P1002)
    await PatientTimeline.create({
      patientId: patient2._id,
      eventType: 'ADMISSION',
      description: 'Emergency admission to Cardiology Intensive Care Unit (CCU) - Bed CCU-001.',
      createdBy: 'Dr. Meenakshi Sundaram (Cardiology)',
      timestamp: new Date(Date.now() - 48 * 3600 * 1000),
    });

    await PatientTimeline.create({
      patientId: patient2._id,
      eventType: 'DIAGNOSTICS',
      description: '12-Lead ECG recorded showing resolving ischemic changes.',
      createdBy: 'T. Shanthi (Cardiology Tech)',
      timestamp: new Date(Date.now() - 36 * 3600 * 1000),
    });

    // Timeline for Kavitha S. (P1003)
    await PatientTimeline.create({
      patientId: patient3._id,
      eventType: 'ADMISSION',
      description: 'Admitted to Orthopedics & Post-Op Recovery Ward - Bed ORTH-001.',
      createdBy: 'Dr. R. Vigneshwaran (Orthopedics)',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000),
    });

    console.log('========================================================================');
    console.log('✅ TAMIL NADU DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log('Doctors Seeded:');
    console.log('  • Dr. S. Karthikeyan (General Medicine) [doctor1 / doctor123]');
    console.log('  • Dr. Meenakshi Sundaram (Cardiology)   [doctor2 / doctor123]');
    console.log('  • Dr. R. Vigneshwaran (Orthopedics)     [doctor3 / doctor123]');
    console.log('Staff Seeded:');
    console.log('  • Dr. K. Senthil Nathan (Admin)         [admin / admin123]');
    console.log('  • P. Malarvizhi (Reception)             [reception / reception123]');
    console.log('  • Vimala Devi M. (Nurse)                [nurse / nurse123]');
    console.log('  • S. Arumugam (Ward Staff)              [ward / ward123]');
    console.log('  • M. Balasubramanian (Diagnostics)      [diagnostics / Password@123]');
    console.log('  • G. Muthukumar (Pharmacy)              [pharmacy / pharmacy123]');
    console.log('  • K. Vijayalakshmi (Billing)            [billing / billing123]');
    console.log('Patients Seeded:');
    console.log('  • Murugan K. (Chennai)                  [P1001 / 12051990]');
    console.log('  • Selvam R. (Coimbatore - CCU Bed)      [P1002 / 25081985]');
    console.log('  • Kavitha S. (Madurai - Ortho Bed)      [P1003 / 14021995]');
    console.log('  • Lakshmi Narayanan M. (Tiruchirappalli)[P1004 / 03111978]');
    console.log('  • Deepa S. (Salem - Outpatient)         [P1005 / 19072001]');
    console.log('========================================================================');

    process.exit(0);
  } catch (error) {
    console.error('Seeding encountered an error:', error);
    process.exit(1);
  }
}

seed();
