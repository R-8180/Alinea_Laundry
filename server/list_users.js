const pool = require('./db');

async function run() {
  try {
    const res = await pool.query('SELECT id, name, email, role, phone FROM users ORDER BY id');
    console.log('List of users in database:');
    console.log(res.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    await pool.end();
  }
}

run();
