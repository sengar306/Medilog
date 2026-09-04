const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Prescription = require('../models/Prescription');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');
const { getUserScope, verifyOwnership } = require('../utils/userScope');

// Multer for prescription image uploads
const uploadDir = path.join(__dirname, '../uploads/prescriptions');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `RX-${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only JPG, PNG or PDF files are allowed for prescriptions'));
  }
});

// @desc    Get all prescriptions (with filters)
// @route   GET /prescriptions?customerId=&status=&from=&to=
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { customerId, status, from, to, search } = req.query;
    const userScope = getUserScope(req);
    const query = {};

    if (userScope.user) {
      query.$or = [
        { user: userScope.user },
        { dispensedBy: userScope.user }
      ];
    }

    if (customerId) query.customer = customerId;
    if (status) query.status = status;

    if (from || to) {
      query.prescriptionDate = {};
      if (from) query.prescriptionDate.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.prescriptionDate.$lte = toDate;
      }
    }

    if (search) {
      const searchOr = [
        { patientName: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
        { clinicName: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const prescriptions = await Prescription.find(query)
      .populate('customer', 'name phone')
      .populate('dispensedBy', 'username email chemistName')
      .populate('user', 'username email chemistName')
      .populate('sale', 'invoiceNumber totalAmount')
      .sort({ prescriptionDate: -1 });

    res.json({ prescriptions, total: prescriptions.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// @desc    Get single prescription
// @route   GET /prescriptions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('customer', 'name phone email address')
      .populate('dispensedBy', 'username email chemistName')
      .populate('user', 'username email chemistName')
      .populate('sale', 'invoiceNumber totalAmount saleDate paymentMode');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const isOwner = verifyOwnership(req, prescription, 'user') || verifyOwnership(req, prescription, 'dispensedBy');
    if (!isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not own this prescription record' });
    }

    res.json(prescription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching prescription' });
  }
});

// @desc    Create a new prescription
// @route   POST /prescriptions
// @access  Private
router.post('/', protect, upload.single('prescriptionImage'), async (req, res) => {
  try {
    const {
      patientName, patientAge, patientGender,
      doctorName, doctorRegistrationNo, clinicName,
      prescriptionDate, medicines, diagnosis, notes,
      customerPhone, customerId, status
    } = req.body;

    if (!patientName || !doctorName) {
      return res.status(400).json({ message: 'Patient name and Doctor name are required' });
    }

    // Resolve or create customer for current user
    let resolvedCustomerId = customerId || null;
    if (!resolvedCustomerId && customerPhone) {
      let customer = await Customer.findOne({ phone: customerPhone, user: req.user._id });
      if (!customer) {
        customer = new Customer({ name: patientName, phone: customerPhone, user: req.user._id });
        await customer.save();
      }
      resolvedCustomerId = customer._id;
    }

    // Parse medicines array if sent as JSON string
    let parsedMedicines = [];
    try {
      parsedMedicines = typeof medicines === 'string' ? JSON.parse(medicines) : (medicines || []);
    } catch (_) {
      parsedMedicines = [];
    }

    const imageUrl = req.file ? `/uploads/prescriptions/${req.file.filename}` : undefined;

    const prescription = new Prescription({
      customer: resolvedCustomerId,
      user: req.user._id,
      patientName: patientName.trim(),
      patientAge: patientAge ? parseInt(patientAge) : undefined,
      patientGender,
      doctorName: doctorName.trim(),
      doctorRegistrationNo,
      clinicName,
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
      medicines: parsedMedicines,
      diagnosis,
      notes,
      imageUrl,
      dispensedBy: req.user._id,
      status: status || 'Pending'
    });

    const saved = await prescription.save();

    await logAudit(
      'Create Prescription',
      'Prescription',
      `Created prescription for patient '${patientName}' by Dr. ${doctorName}`,
      req.user._id,
      req
    );

    const populated = await Prescription.findById(saved._id)
      .populate('customer', 'name phone')
      .populate('dispensedBy', 'username');

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating prescription' });
  }
});

// @desc    Update prescription status or link sale
// @route   PATCH /prescriptions/:id
// @access  Private
router.patch('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const isOwner = verifyOwnership(req, prescription, 'user') || verifyOwnership(req, prescription, 'dispensedBy');
    if (!isOwner) {
      return res.status(403).json({ message: 'Access Denied: You cannot modify another user\'s prescription' });
    }

    const { status, saleId, notes } = req.body;
    if (status) prescription.status = status;
    if (saleId) prescription.sale = saleId;
    if (notes !== undefined) prescription.notes = notes;

    await prescription.save();

    await logAudit(
      'Update Prescription',
      'Prescription',
      `Updated prescription ${req.params.id} — status: ${status || 'unchanged'}`,
      req.user._id,
      req
    );

    const updated = await Prescription.findById(prescription._id)
      .populate('customer', 'name phone')
      .populate('dispensedBy', 'username')
      .populate('sale', 'invoiceNumber totalAmount');

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating prescription' });
  }
});

// @desc    Delete a prescription
// @route   DELETE /prescriptions/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    const isOwner = verifyOwnership(req, prescription, 'user') || verifyOwnership(req, prescription, 'dispensedBy');
    if (!isOwner) {
      return res.status(403).json({ message: 'Access Denied: You cannot delete another user\'s prescription' });
    }

    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Prescription deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting prescription' });
  }
});

module.exports = router;
