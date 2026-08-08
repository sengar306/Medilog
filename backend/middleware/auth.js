const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medilog_secret_key');
      
      req.user = await User.findById(decoded.id).populate('role');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'Not authorized, user not active or not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user && req.user.role && roles.includes(req.user.role.name)) {
      next();
    } else {
      return res.status(403).json({ message: `Forbidden: Access restricted to roles: [${roles.join(', ')}]` });
    }
  };
};

module.exports = { protect, authorize };
