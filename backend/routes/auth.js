const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { logAudit } = require('../utils/logger');
const { protect } = require('../middleware/auth');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'medilog_secret_key', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp('^' + username + '$', 'i') } },
        { email: { $regex: new RegExp('^' + username + '$', 'i') } }
      ]
    }).populate('role');

    if (user && (await user.comparePassword(password))) {
      await logAudit('Login', 'Auth', `User '${username}' logged in successfully`, user._id, req);
      
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role ? user.role.name : 'Unknown',
        token: generateToken(user._id),
      });
    } else {
      await logAudit('Login Failed', 'Auth', `Failed login attempt for username '${username}'`, null, req);
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('role').select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
