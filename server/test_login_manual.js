const pool = require('./db');
const bcrypt = require('bcryptjs');

async function check() {
  const email = 'admin@alinea.com';
  const password = 'password';
  try {
    const res = await pool.query('SELECT id, password, role FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      console.log('User not found!');
      process.exit(1);
    }
    const user = res.rows[0];
    console.log('User found:', user.id, user.role);
    console.log('Hash in DB:', user.password);
    const match = await bcrypt.compare(password, user.password);
    console.log('Match result:', match);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
