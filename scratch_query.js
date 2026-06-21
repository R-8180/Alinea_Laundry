require('dotenv').config({ path: './server/.env' });
const db = require('./server/db');

const query = `
  SELECT 
    s.category,
    s.name as service_name,
    oi.service_type,
    oi.name as item_name,
    COUNT(oi.id) as total_sold
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  LEFT JOIN services s ON oi.service_id = s.id
  WHERE o.payment_status = 'paid'
  GROUP BY s.category, s.name, oi.service_type, oi.name 
  ORDER BY total_sold DESC 
  LIMIT 5
`;

db.query(query)
  .then(res => {
    console.log("SUCCESS:", res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:", err);
    process.exit(1);
  });
