require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

// PENTING: Script ini menggunakan koneksi database dari file .env
// Pastikan file .env sudah terisi dengan kredensial yang benar sebelum menjalankan script ini.

console.log('⏳ Menghubungkan ke database (lewat .env)...');

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CATATAN KEAMANAN:
    // Password default di bawah ini ('password') HANYA untuk testing awal.
    // Segera ubah password semua akun ini setelah pertama kali login!
    const hashedPassword = await bcrypt.hash('password', 12);
    
    console.log('⚠️  PERINGATAN: Akun dibuat dengan password default "password". SEGERA UBAH setelah login!');
    
    console.log('⏳ Memasukkan data Admin Utama (admin@alinea.com)...');
    const checkAdmin = await client.query('SELECT id FROM users WHERE email = $1', ['admin@alinea.com']);
    if (checkAdmin.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone)
        VALUES ('Admin Alinea', 'admin@alinea.com', $1, 'admin', 'Jl. Talangsari No.36A Semarang', '081227884654')
      `, [hashedPassword]);
      console.log('✅ Akun Admin berhasil dibuat! (password: "password" — SEGERA GANTI!)');
    } else {
      console.log('ℹ️ Akun Admin sudah ada di database.');
    }

    console.log('⏳ Memasukkan data Pelanggan/User (bagas@mail.com)...');
    const checkCustomer1 = await client.query('SELECT id FROM users WHERE email = $1', ['bagas@mail.com']);
    if (checkCustomer1.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone, points)
        VALUES ('Bagas Customer', 'bagas@mail.com', $1, 'customer', 'Jl. Taman Siswa No.50 Semarang', '081227884654', 100)
      `, [hashedPassword]);
      console.log('✅ Akun Pelanggan (bagas@mail.com) berhasil dibuat!');
    } else {
      console.log('ℹ️ Akun Pelanggan (bagas@mail.com) sudah ada di database.');
    }
    
    console.log('⏳ Memasukkan data Kurir Uji Coba...');
    const checkCourier1 = await client.query('SELECT id FROM users WHERE email = $1', ['rian@mail.com']);
    if (checkCourier1.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone)
        VALUES ('Rian Courier', 'rian@mail.com', $1, 'courier', 'Jl. Melati No.8 Semarang', '08111222333')
      `, [hashedPassword]);
    }
    
    const checkCourier2 = await client.query('SELECT id FROM users WHERE email = $1', ['budi@mail.com']);
    if (checkCourier2.rows.length === 0) {
      await client.query(`
        INSERT INTO users (name, email, password, role, address, phone)
        VALUES ('Budi Courier', 'budi@mail.com', $1, 'courier', 'Jl. Taman Siswa No.50 Semarang', '081227884655')
      `, [hashedPassword]);
    }
    console.log('✅ Akun Kurir berhasil disiapkan!');
    
    console.log('⏳ Memasukkan data Layanan Laundry Asli...');
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
    console.log('\n🎉 ALL DONE! Database telah berhasil dipopulasikan!');
    console.log('\n⚠️  INGAT: Segera ganti password semua akun setelah login pertama!\n');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Terjadi kesalahan saat seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
