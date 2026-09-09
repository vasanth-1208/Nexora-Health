require('dotenv').config();
const mongoose = require('mongoose');

async function sync() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const activeAdmissions = await mongoose.connection.db.collection('admissions').find({
    admissionStatus: { $in: ['RECOMMENDED', 'RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED'] }
  }).sort({ createdAt: -1 }).toArray();

  console.log('Active admissions found:', activeAdmissions.length);
  for (const adm of activeAdmissions) {
    const res = await mongoose.connection.db.collection('patients').updateOne(
      { _id: adm.patientId },
      { $set: { currentAdmissionId: adm._id } }
    );
    console.log('Linked admission', adm._id, 'to patient', adm.patientId, 'modified:', res.modifiedCount);
  }

  const patients = await mongoose.connection.db.collection('patients').find({}).toArray();
  for (const p of patients) {
    console.log(`Patient ${p.patientId} (${p._id}): currentAdmissionId = ${p.currentAdmissionId}`);
  }

  process.exit(0);
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
