const AuditLog = require('../models/AuditLog');

const logAudit = async (action, module, description, userId = null, req = null) => {
  try {
    let ipAddress = '';
    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    }
    
    const log = new AuditLog({
      action,
      module,
      description,
      user: userId,
      ipAddress,
    });
    
    await log.save();
    console.log(`[AUDIT] Action: ${action} | Module: ${module} | Desc: ${description}`);
  } catch (err) {
    console.error('Failed to save audit log:', err.message);
  }
};

module.exports = { logAudit };
