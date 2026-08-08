const mongoose = require('mongoose');

const InvoiceParserJobSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Success', 'Failed'],
    default: 'Pending',
  },
  parsedData: {
    type: mongoose.Schema.Types.Mixed, // Raw JSON returned from Gemini
  },
  error: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('InvoiceParserJob', InvoiceParserJobSchema);
