/**
 * Migration: Add courier_notes column to orders table
 * 
 * Jalankan script ini SATU KALI untuk menambahkan kolom courier_notes.
 * Kolom ini memisahkan catatan untuk kurir dari catatan untuk admin.
 * 
 * Usage: node server/add-courier-notes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./db');

async function migrate() {
  try {
    console.log('🔄 Menambahkan kolom courier_notes ke tabel orders...');
    
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS courier_notes TEXT DEFAULT ''
    `);
    
    console.log('✅ Kolom courier_notes berhasil ditambahkan!');
    console.log('');
    console.log('Sekarang:');
    console.log('  - notes       = Catatan pesanan (untuk Admin/Laundry)');
    console.log('  - courier_notes = Catatan untuk Kurir (penjemputan/pengantaran)');
    
    process.exit(0);
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️  Kolom courier_notes sudah ada, tidak perlu migrasi.');
      process.exit(0);
    }
    console.error('❌ Gagal migrasi:', err.message);
    process.exit(1);
  }
}

migrate();
