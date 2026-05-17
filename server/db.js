const mysql = require('mysql2');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',        // default XAMPP
  password: process.env.DB_PASSWORD || '',        
  database: process.env.DB_NAME || 'alinea_laundry',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Gagal konek database:', err);
    return;
  }
  console.log('Database terkoneksi');
  if (connection) connection.release();
});

module.exports = pool;