const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET not set in environment variables!');
  process.exit(1);
}

const SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
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