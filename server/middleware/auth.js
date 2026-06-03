const jwt = require('jsonwebtoken');

const JWT_SECRET_MISSING = !process.env.JWT_SECRET;
if (JWT_SECRET_MISSING) {
  console.error('❌ FATAL: JWT_SECRET not set in environment variables! Auth will be disabled.');
}

const SECRET = process.env.JWT_SECRET || 'FALLBACK_NOT_SECURE';

module.exports = (req, res, next) => {
  if (JWT_SECRET_MISSING) {
    return res.status(503).json({ message: 'Server belum dikonfigurasi (JWT_SECRET tidak ada). Hubungi administrator.' });
  }
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan atau format salah' });
  }
  
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token sudah kadaluarsa' });
    }
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};