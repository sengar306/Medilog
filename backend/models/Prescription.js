const mongoose = require('mongoose');

const PrescribedMedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String },       // e.g. "500mg twice daily"
  duration: { type: String },     // e.g. "7 days"
  notes: { type: String }
}, { _id: false });

const PrescriptionSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientAge: {
    type: Number
  },
  patientGender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  doctorRegistrationNo: {
    type: String,
    trim: true
  },
  clinicName: {
    type: String,
    trim: true
  },
  prescriptionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  medicines: [PrescribedMedicineSchema],
  diagnosis: {
    type: String,
    trim: true
  },
  notes: {
    type: String
  },
  imageUrl: {
    type: String   // Uploaded prescription image path
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Pending', 'Dispensed', 'Partial', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
