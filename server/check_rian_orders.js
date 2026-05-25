const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'alinea_laundry'
});

connection.query(
  `SELECT o.id, o.order_code, o.status, o.courier_id, u.name as courier_name 
   FROM orders o 
   LEFT JOIN users u ON o.courier_id = u.id 
   WHERE o.status = 'selesai' AND u.name LIKE '%Rian%'`,
  (err, results) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }
);
