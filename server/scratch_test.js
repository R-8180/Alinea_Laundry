const pool = require('./db');
const crypto = require('crypto');

async function test() {
  console.log('Testing forgot password query logic...');
  try {
    // 1. Check database connection & select a test user
    const userRes = await pool.query('SELECT id, name, email FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('❌ No users found in database to test.');
      process.exit(1);
    }
    const user = userRes.rows[0];
    console.log(`Found test user: ${user.name} (${user.email})`);

    // 2. Try generating token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);
    console.log(`Generated token: ${token}, expires at: ${expires}`);

    // 3. Try updating DB
    const updateRes = await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3 RETURNING id',
      [token, expires, user.id]
    );
    console.log(`✅ Update successful! Rows affected: ${updateRes.rowCount}, ID: ${updateRes.rows[0].id}`);
    
    // Clear it back
    await pool.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1',
      [user.id]
    );
    console.log('✅ Cleaned up test tokens. Success!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error occurred during query test:', err);
    process.exit(1);
  }
}

test();
