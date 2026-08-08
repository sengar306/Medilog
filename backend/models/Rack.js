const mongoose = require('mongoose');

const RackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('Rack', RackSchema);
