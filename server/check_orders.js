const db = require('./db');

db.query("ALTER TABLE orders MODIFY status enum('menunggu','pickup','cuci','antar','selesai','batal') DEFAULT 'menunggu'", (err) => {
  if (err) throw err;
  console.log('Table altered');
  
  db.query("UPDATE orders SET status = 'batal' WHERE status = ''", (err, result) => {
    if (err) throw err;
    console.log('Rows updated:', result.affectedRows);
    process.exit();
  });
});
