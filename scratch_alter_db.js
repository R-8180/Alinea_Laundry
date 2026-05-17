const pool = require('./server/db');

async function run() {
  try {
    await pool.query('ALTER TABLE addresses ADD COLUMN note TEXT DEFAULT \'\'');
    console.log('✅ Berhasil menambahkan kolom note ke tabel addresses!');
  } catch (err) {
    if (err.code === '42701') { // column "note" of relation "addresses" already exists
      console.log('✅ Kolom note sudah ada di tabel addresses.');
    } else {
      console.error('❌ Gagal menambahkan kolom:', err);
    }
  } finally {
    pool.end();
  }
}

run();
