require('dotenv').config({path: './server/.env'});
const jwt = require('jsonwebtoken');
const pool = require('./server/db');

async function test() {
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE role='customer' LIMIT 1");
    const user = userRes.rows[0];
    if (!user) return console.log('No user');
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, branch_id: user.branch_id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    console.log('Token:', token);
    
    const orderRes = await pool.query('SELECT id FROM orders WHERE user_id=$1 LIMIT 1', [user.id]);
    const order = orderRes.rows[0];
    if (!order) return console.log('No order');
    console.log('Order:', order.id);
    
    const res = await fetch('http://localhost:5000/api/orders/' + order.id + '/complete', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Success:', data);
  } catch(err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}
test();
