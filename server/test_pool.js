const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.wthbboyvmhqufmbgmznq',
  password: 'Pemalang123.',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function run() {
  console.log('Testing Pool connection with 2000ms timeout...');
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Pool connection SUCCESS:', res.rows[0]);
  } catch (err) {
    console.error('❌ Pool connection FAILED:', err.message, err.stack);
  }
  await pool.end();
}

run();
