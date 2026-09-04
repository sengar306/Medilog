const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  chemistName: {
    type: String,
    trim: true,
    default: '',
  },
  logoUrl: {
    type: String,
    trim: true,
    default: '',
  },
  whatsappConfig: {
    metaAccessToken: { type: String, default: '' },
    metaPhoneNumberId: { type: String, default: '' },
    metaBusinessId: { type: String, default: '' },
    businessName: { type: String, default: '' },
    senderNumber: { type: String, default: '' }
  },
  pdfConfig: {
    gstNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    stateName: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    drugLicenseNumber: { type: String, default: '' },
    invoiceFooter: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' }
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
