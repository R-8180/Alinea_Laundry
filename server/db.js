const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',        // default XAMPP
  password: '',        // default kosong
  database: 'alinea_laundry'
});

connection.connect(err => {
  if (err) {
    console.error('Gagal konek database:', err);
    return;
  }
  console.log('Database terkoneksi');
});

module.exports = connection;