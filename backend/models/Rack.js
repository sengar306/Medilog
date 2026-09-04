const mongoose = require('mongoose');

const RackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  description: {
    type: String,
  }
}, { timestamps: true });

RackSchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Rack', RackSchema);
