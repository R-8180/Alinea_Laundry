require('dotenv').config({ path: './server/.env' });
const db = require('./server/db');

// Mock route handler for GET /top-services
async function testTopServices(req, res) {
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  let query = `
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
  `;
  const params = [];
  if (activeBranchId) {
    query += ` AND o.branch_id = $1`;
    params.push(activeBranchId);
  }
  query += ` GROUP BY s.category, s.name, oi.service_type, oi.name ORDER BY total_sold DESC LIMIT 5`;

  try {
    const result = await db.query(query, params);
    console.log("Top Services Result:", result.rows);
  } catch (err) {
    console.error("Top Services Handler Error:", err);
  }
}

// Mock route handler for GET /chart
async function testChart(req, res) {
  const { start, end, year, month } = req.query;
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  
  let dateSelect = "created_at::date AS date";
  let groupBy = "created_at::date";
  
  if (year && !month) {
    dateSelect = "DATE_TRUNC('month', created_at)::date AS date";
    groupBy = "DATE_TRUNC('month', created_at)";
  }

  let query = `SELECT ${dateSelect}, SUM(total_price) AS total
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  let paramIndex = 1;

  if (activeBranchId) {
    query += ` AND branch_id = $${paramIndex++}`;
    params.push(activeBranchId);
  }

  if (start && end) {
    query += ` AND created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(start, end);
  } else if (year && month) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++} AND EXTRACT(MONTH FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year), parseInt(month));
  } else if (year) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year));
  } else {
    query += ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
  }

  query += ` GROUP BY ${groupBy} ORDER BY date ASC`;

  try {
    const result = await db.query(query, params);
    console.log("Chart Result:", result.rows);
  } catch (err) {
    console.error("Chart Handler Error:", err);
  }
}

async function run() {
  const req = {
    user: { role: 'admin', branch_id: null },
    query: { year: '2026', month: '05' }
  };
  console.log("--- Testing Top Services ---");
  await testTopServices(req);
  console.log("--- Testing Chart ---");
  await testChart(req);
  process.exit(0);
}

run();
