require('dotenv').config();
const pool = require('./db');

async function run() {
  try {
    await pool.query('ALTER TABLE addresses ADD COLUMN IF NOT EXISTS note TEXT DEFAULT \'\'');
    console.log('✅ Berhasil menambahkan kolom note ke tabel addresses!');
    
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_notes TEXT DEFAULT \'\'');
    console.log('✅ Berhasil menambahkan kolom courier_notes ke tabel orders!');
  } catch (err) {
    console.error('❌ Gagal menambahkan kolom:', err.message);
  } finally {
    pool.end();
  }
}

run();
