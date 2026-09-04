const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/logger');

// @desc    Get all users (excluding password, populated with role)
// @route   GET /api/v1/users
// @access  Private (Admin)
router.get('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const users = await User.find({}).populate('role', 'name description').select('-password');
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @desc    Create a new user
// @route   POST /api/v1/users
// @access  Private (Admin)
router.post('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const { username, email, password, roleName, chemistName } = req.body;

    if (!username || !email || !password || !roleName) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }

    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this username or email already exists' });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({ message: `Role '${roleName}' does not exist` });
    }

    const newUser = new User({
      username,
      email,
      password,
      role: role._id,
      chemistName: chemistName ? chemistName.trim() : username
    });

    await newUser.save();
    
    await logAudit(
      'User Created',
      'User Management',
      `Created user '${username}' (${chemistName || username}) with role '${roleName}'`,
      req.user._id,
      req
    );

    const populated = await User.findById(newUser._id).populate('role', 'name').select('-password');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error creating user' });
  }
});

// @desc    Update user details
// @route   PUT /api/v1/users/:id
// @access  Private (Admin)
router.put('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const { username, email, roleName, isActive, chemistName } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;
    if (chemistName !== undefined) user.chemistName = chemistName.trim();

    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        return res.status(400).json({ message: `Role '${roleName}' does not exist` });
      }
      user.role = role._id;
    }

    await user.save();

    await logAudit(
      'User Updated',
      'User Management',
      `Updated user '${user.username}' details (Active: ${user.isActive})`,
      req.user._id,
      req
    );

    const populated = await User.findById(user._id).populate('role', 'name').select('-password');
    res.json(populated);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// @desc    Reset user password
// @route   PUT /api/v1/users/:id/reset-password
// @access  Private (Admin)
router.put('/:id/reset-password', protect, authorize('Admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters long' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword; // Hashing is triggered in pre('save') hook
    await user.save();

    await logAudit(
      'Password Reset',
      'User Management',
      `Administrative password reset for user '${user.username}'`,
      req.user._id,
      req
    );

    res.json({ success: true, message: `Password reset successfully for ${user.username}` });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent Admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own administrative account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit(
      'User Deleted',
      'User Management',
      `Deleted user account '${user.username}'`,
      req.user._id,
      req
    );

    res.json({ success: true, message: `User ${user.username} deleted successfully` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

module.exports = router;
