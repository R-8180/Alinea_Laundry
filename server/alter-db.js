require('dotenv').config();
const pool = require('./db');

async function run() {
  try {
    await pool.query('ALTER TABLE addresses ADD COLUMN IF NOT EXISTS note TEXT DEFAULT \'\'');
    console.log('✅ Berhasil menambahkan kolom note ke tabel addresses!');
    
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_notes TEXT DEFAULT \'\'');
    console.log('✅ Berhasil menambahkan kolom courier_notes ke tabel orders!');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders (order_code)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
    console.log('✅ Berhasil menambahkan indexes untuk optimasi pencarian!');
  } catch (err) {
    console.error('❌ Gagal menambahkan kolom:', err);
  } finally {
    pool.end();
  }
}

run();
