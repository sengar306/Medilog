const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medilog_secret_key');
      
      req.user = await User.findById(decoded.id).populate('role');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'Not authorized, user not active or not found' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user) {
      let roleName = 'User';
      if (req.user.role) {
        roleName = typeof req.user.role === 'string' ? req.user.role : (req.user.role.name || 'User');
      }

      const isAdmin = roleName === 'Admin' || roleName === 'Super Admin';
      const isChemistUser = roleName === 'Chemist' || roleName === 'User';
      const expectsChemistUser = roles.includes('User') || roles.includes('Chemist');

      if (isAdmin || roles.includes(roleName) || (expectsChemistUser && isChemistUser)) {
        return next();
      }
    }
    return res.status(403).json({ message: `Forbidden: Access restricted to roles: [${roles.join(', ')}]` });
  };
};

module.exports = { protect, authorize };
