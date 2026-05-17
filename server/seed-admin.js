const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

console.log('⏳ Menghubungkan ke Supabase Production...');

// Kredensial Supabase Production (menggunakan Pooler IPv4)
const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.nmuxiduvphjfdmtpztzc',
  password: 's8ZURDnpX0coSfcu',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Hash password "password" dengan 12 rounds
    const hashedPassword = await bcrypt.hash('password', 12);
    
    console.log('⏳ Memasukkan data Admin Utama (admin@alinea.com)...');
    // Cek apakah admin sudah ada
    const checkAdmin = await client.query('SELECT id FROM users WHERE email = $1', ['admin@alinea.com']);
    if (checkAdmin.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone)
        VALUES ('Admin Alinea', 'admin@alinea.com', $1, 'admin', 'Jl. Talangsari No.36A Semarang', '081227884654')
      `, [hashedPassword]);
      console.log('✅ Akun Admin berhasil dibuat!');
    } else {
      console.log('ℹ️ Akun Admin sudah ada di database.');
    }
    
    console.log('⏳ Memasukkan data Kurir Uji Coba...');
    // Cek Kurir 1
    const checkCourier1 = await client.query('SELECT id FROM users WHERE email = $1', ['rian@mail.com']);
    if (checkCourier1.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone)
        VALUES ('Rian Courier', 'rian@mail.com', $1, 'courier', 'Jl. Melati No.8 Semarang', '08111222333')
      `, [hashedPassword]);
    }
    
    // Cek Kurir 2
    const checkCourier2 = await client.query('SELECT id FROM users WHERE email = $1', ['budi@mail.com']);
    if (checkCourier2.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone)
        VALUES ('Budi Courier', 'budi@mail.com', $1, 'courier', 'Jl. Taman Siswa No.50 Semarang', '081227884655')
      `, [hashedPassword]);
    }
    console.log('✅ Akun Kurir berhasil disiapkan!');
    
    console.log('⏳ Memasukkan data Layanan Laundry Asli...');
    // Cek & masukkan layanan
    const checkServices = await client.query('SELECT id FROM services LIMIT 1');
    if (checkServices.rows.length === 0) {
      await client.query(`
        INSERT INTO services (category, name, type, time_days, time_hours, unit_type, price_per_unit, is_active) VALUES
        ('cuci_setrika', 'Reguler 4 Hari', 'reguler', 4, 0, 'kg', 6000.00, true),
        ('cuci_setrika', 'Reguler 3 Hari', 'reguler', 3, 0, 'kg', 6000.00, true),
        ('cuci_setrika', 'Reguler 2 Hari', 'reguler', 2, 0, 'kg', 7000.00, true),
        ('cuci_setrika', 'Express 24 Jam', 'express', 1, 0, 'kg', 10000.00, true),
        ('cuci_setrika', 'Express 8 Jam', 'express', 0, 8, 'kg', 12000.00, true),
        ('cuci_setrika', 'Express 2 Jam', 'express', 0, 2, 'kg', 16000.00, false),
        ('cuci_lipat', 'Reguler 1 Hari', 'reguler', 1, 0, 'kg', 6000.00, true),
        ('cuci_lipat', 'Reguler 8 Jam', 'reguler', 0, 8, 'kg', 10000.00, true),
        ('cuci_lipat', 'Reguler 2 Jam', 'reguler', 0, 2, 'kg', 14000.00, false),
        ('satuan', 'Boneka', 'reguler', 2, 0, 'pcs', 15000.00, true),
        ('satuan', 'Karpet', 'reguler', 3, 0, 'pcs', 20000.00, true),
        ('satuan', 'Sepatu', 'reguler', 2, 0, 'pcs', 18000.00, true),
        ('satuan', 'Bantal', 'reguler', 1, 0, 'pcs', 10000.00, true),
        ('satuan', 'Lainnya', 'reguler', 2, 0, 'pcs', 10000.00, true)
      `);
      console.log('✅ Layanan laundry asli berhasil ditambahkan!');
    } else {
      console.log('ℹ️ Layanan laundry sudah terisi.');
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 ALL DONE! Database Supabase telah berhasil dipopulasikan dengan data asli Anda!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Terjadi kesalahan saat seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
