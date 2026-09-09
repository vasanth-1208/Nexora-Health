require('dotenv').config();
const mongoose = require('mongoose');

async function seedWards() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Ward = mongoose.connection.db.collection('wards');
  const Department = mongoose.connection.db.collection('departments');
  const Block = mongoose.connection.db.collection('blocks');
  const Floor = mongoose.connection.db.collection('floors');
  const BedSet = mongoose.connection.db.collection('bedsets');
  const Bed = mongoose.connection.db.collection('beds');

  // Clean up junk test wards
  const junkWards = await Ward.find({ name: { $in: ['fs', ' dd', 'vvwv', 'wd', 'wdwd'] } }).toArray();
  for (const jw of junkWards) {
    const sets = await BedSet.find({ wardId: jw._id }).toArray();
    for (const s of sets) {
      await Bed.deleteMany({ bedSetId: s._id });
    }
    await BedSet.deleteMany({ wardId: jw._id });
    await Ward.deleteOne({ _id: jw._id });
    console.log('Cleaned up junk ward:', jw.name);
  }

  // Fetch departments
  const gmDept = await Department.findOne({ name: 'General Medicine' });
  const cardDept = await Department.findOne({ name: 'Cardiology' });
  const orthoDept = await Department.findOne({ name: 'Orthopedics' });

  // Fetch floors
  const floor1A = await Floor.findOne({ name: 'Floor 1' });
  const floor2A = await Floor.findOne({ name: 'Floor 2' });

  const standardWards = [
    // General Medicine
    { name: 'GM Medical ICU (MICU)', departmentId: gmDept._id, floorId: floor2A._id, gender: 'GENERAL', code: 'GM-MICU', bedCount: 4 },
    { name: 'GM Step-Down Ward', departmentId: gmDept._id, floorId: floor1A._id, gender: 'GENERAL', code: 'GM-SDW', bedCount: 4 },
    
    // Cardiology
    { name: 'Cardiology Step-Down Ward (CCU)', departmentId: cardDept._id, floorId: floor2A._id, gender: 'GENERAL', code: 'CARD-CCU', bedCount: 4 },
    { name: 'Cardiology General Inpatient Ward', departmentId: cardDept._id, floorId: floor2A._id, gender: 'GENERAL', code: 'CARD-GEN', bedCount: 4 },

    // Orthopedics
    { name: 'Orthopedic Post-Op Recovery Ward', departmentId: orthoDept._id, floorId: floor1A._id, gender: 'GENERAL', code: 'ORTH-REC', bedCount: 4 },
    { name: 'Orthopedic Trauma Care Unit', departmentId: orthoDept._id, floorId: floor1A._id, gender: 'GENERAL', code: 'ORTH-TRM', bedCount: 4 },
  ];

  for (const sw of standardWards) {
    let existing = await Ward.findOne({ name: sw.name });
    if (!existing) {
      const inserted = await Ward.insertOne({
        name: sw.name,
        departmentId: sw.departmentId,
        floorId: sw.floorId,
        gender: sw.gender,
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      });
      existing = { _id: inserted.insertedId, name: sw.name };
      console.log('Created ward:', sw.name);
    } else {
      console.log('Ward already exists:', sw.name);
    }

    // Ensure BedSet exists for this ward
    let set = await BedSet.findOne({ wardId: existing._id });
    if (!set) {
      const setInserted = await BedSet.insertOne({
        name: `${sw.name} - Bay 1`,
        wardId: existing._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      });
      set = { _id: setInserted.insertedId, name: `${sw.name} - Bay 1` };
      console.log('Created BedSet for:', sw.name);
    }

    // Ensure Beds exist
    const existingBeds = await Bed.find({ bedSetId: set._id }).toArray();
    if (existingBeds.length === 0) {
      for (let i = 1; i <= sw.bedCount; i++) {
        const bedIdStr = `${sw.code}-00${i}`;
        await Bed.insertOne({
          bedId: bedIdStr,
          bedSetId: set._id,
          status: 'AVAILABLE',
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        });
        console.log('Created bed:', bedIdStr);
      }
    }
  }

  const allWards = await Ward.find({}).toArray();
  console.log('\nFinal Wards Count:', allWards.length);
  for (const w of allWards) {
    const dept = await Department.findOne({ _id: w.departmentId });
    console.log(`Ward: ${w.name} (${dept ? dept.name : 'Unknown'})`);
  }

  process.exit(0);
}

seedWards().catch(err => {
  console.error(err);
  process.exit(1);
});
