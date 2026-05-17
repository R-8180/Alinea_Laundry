const mysql = require('mysql2');
const db = mysql.createConnection({host: 'localhost', user: 'root', password: '', database: 'alinea_laundry'});
db.query("SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone, (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name, (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types FROM orders o JOIN users u ON o.user_id = u.id WHERE o.courier_id = 3 AND o.status != 'selesai' ORDER BY o.created_at DESC", (err, rows) => {
  if (err) console.error("ERR:", err);
  else console.log("OK:", rows.length);
  process.exit();
});
