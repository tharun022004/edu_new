const mongoose = require('mongoose');
require('dotenv').config();

const Class = require('./models/Class');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const attendances = await Attendance.find().populate('records.student');
  console.log(JSON.stringify(attendances, null, 2));
  
  process.exit(0);
}

test();
