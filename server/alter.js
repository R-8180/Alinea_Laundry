const db = require('./db');
db.query("ALTER TABLE orders MODIFY COLUMN status ENUM('menunggu','pickup','cuci','antar','selesai','batal') DEFAULT 'menunggu'", (err, res) => {
  if (err) console.error(err);
  else console.log('Success');
  process.exit(0);
});
