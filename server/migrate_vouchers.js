const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' || (process.env.DB_HOST && process.env.DB_HOST.includes('supabase')) ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('⏳ Membuat tabel voucher_templates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS voucher_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        points_required INTEGER NOT NULL,
        description TEXT,
        discount_amount INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('⏳ Update tabel vouchers...');
    await client.query(`
      ALTER TABLE vouchers
      ADD COLUMN IF NOT EXISTS voucher_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
    `);

    // Hapus data lama yang mungkin konflik jika mau (opsional, tapi lebih baik biarkan dulu, kita hanya menambah kolom)

    // Insert default templates
    console.log('⏳ Menambahkan template voucher default...');
    const existing = await client.query('SELECT COUNT(*) FROM voucher_templates');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO voucher_templates (name, points_required, description, discount_amount)
        VALUES 
        ('Voucher Cuci Kering', 50, 'Gunakan voucher ini untuk mendapatkan potongan harga penuh pada pesanan Cuci Kering.', 1000000),
        ('Voucher Cuci Setrika', 70, 'Gunakan voucher ini untuk mendapatkan potongan harga penuh pada pesanan Cuci Setrika.', 1000000)
      `);
      // Note: discount_amount 1000000 means it covers any reasonable price.
    }

    await client.query('COMMIT');
    console.log('✅ Migrasi Vouchers & Points berhasil!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migrasi gagal:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
