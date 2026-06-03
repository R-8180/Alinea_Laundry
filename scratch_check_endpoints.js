require('dotenv').config({ path: './server/.env' });
const db = require('./server/db');

async function countJuneOrders() {
  try {
    const resAll = await db.query("SELECT COUNT(*) FROM orders WHERE created_at >= '2026-06-01'");
    const resPaid = await db.query("SELECT COUNT(*) FROM orders WHERE created_at >= '2026-06-01' AND payment_status = 'paid'");
    console.log("June Orders Count:", resAll.rows[0].count);
    console.log("June Paid Orders Count:", resPaid.rows[0].count);
  } catch (e) {
    console.error("Query failed:", e);
  }
  process.exit(0);
}

countJuneOrders();
