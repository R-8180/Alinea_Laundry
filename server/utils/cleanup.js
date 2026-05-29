const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { createClient } = require('@supabase/supabase-js');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const useSupabase = isVercel || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

const cleanOldUploads = async () => {
  console.log('🧹 [Cleanup] Memulai pembersihan berkala file upload (umur > 30 hari)...');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 hari yang lalu

  // 1. Pembersihan File Lokal (untuk Local Development)
  const uploadDir = path.join(__dirname, '../uploads');
  if (fs.existsSync(uploadDir)) {
    try {
      const files = fs.readdirSync(uploadDir);
      let localDeletedCount = 0;
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        
        if (fileAgeDays > 30) {
          try {
            fs.unlinkSync(filePath);
            localDeletedCount++;
            console.log(`[Cleanup] Berhasil menghapus file lokal kedaluwarsa: ${file} (${Math.round(fileAgeDays)} hari)`);
          } catch (err) {
            console.error(`[Cleanup] Gagal menghapus file lokal ${file}:`, err.message);
          }
        }
      });
      if (localDeletedCount > 0) {
        console.log(`🧹 [Cleanup] Selesai menghapus ${localDeletedCount} file lokal yang kedaluwarsa.`);
      }
    } catch (err) {
      console.error('[Cleanup] Gagal membaca direktori uploads:', err.message);
    }
  }

  // 2. Pembersihan Supabase Storage (untuk Production/Live)
  if (useSupabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const bucketName = process.env.SUPABASE_BUCKET || 'uploads_foto';

      // Cari order yang berumur > 30 hari dan memiliki photo_url atau delivery_proof di Supabase
      const oldOrdersRes = await pool.query(
        `SELECT id, photo_url, delivery_proof FROM orders 
         WHERE created_at < $1 AND (photo_url IS NOT NULL OR delivery_proof IS NOT NULL)`,
        [cutoffDate]
      );

      // Cari bukti pembayaran yang berumur > 30 hari di Supabase
      const oldPaymentsRes = await pool.query(
        `SELECT id, payment_proof FROM payments 
         WHERE created_at < $1 AND payment_proof IS NOT NULL`,
        [cutoffDate]
      );

      const filesToDelete = [];

      const extractFilename = (url) => {
        if (!url) return null;
        // Contoh URL Supabase: https://xxx.supabase.co/storage/v1/object/public/uploads_foto/file-123.png
        const parts = url.split(`/${bucketName}/`);
        if (parts.length > 1) {
          return parts[1];
        }
        return null;
      };

      // Kumpulkan file dari orders
      oldOrdersRes.rows.forEach(row => {
        if (row.photo_url) {
          const fn = extractFilename(row.photo_url);
          if (fn) filesToDelete.push({ id: row.id, table: 'orders', field: 'photo_url', filename: fn });
        }
        if (row.delivery_proof) {
          const fn = extractFilename(row.delivery_proof);
          if (fn) filesToDelete.push({ id: row.id, table: 'orders', field: 'delivery_proof', filename: fn });
        }
      });

      // Kumpulkan file dari payments
      oldPaymentsRes.rows.forEach(row => {
        if (row.payment_proof) {
          const fn = extractFilename(row.payment_proof);
          if (fn) filesToDelete.push({ id: row.id, table: 'payments', field: 'payment_proof', filename: fn });
        }
      });

      if (filesToDelete.length > 0) {
        console.log(`[Cleanup] Menemukan ${filesToDelete.length} file cloud (Supabase) yang siap dihapus.`);
        
        // Hapus file secara bulk/batch dari Supabase Storage
        const filenames = filesToDelete.map(f => f.filename);
        const { data, error } = await supabase.storage
          .from(bucketName)
          .remove(filenames);

        if (error) {
          console.error('[Cleanup] Gagal menghapus file dari Supabase Storage:', error.message);
        } else {
          console.log(`🧹 [Cleanup] Berhasil menghapus ${data?.length || 0} file dari Supabase Storage.`);
          
          // Kosongkan/update kolom database agar tidak merujuk ke URL yang sudah dihapus
          for (const item of filesToDelete) {
            try {
              if (item.table === 'orders') {
                await pool.query(`UPDATE orders SET ${item.field} = NULL WHERE id = $1`, [item.id]);
              } else if (item.table === 'payments') {
                await pool.query(`UPDATE payments SET payment_proof = NULL WHERE id = $1`, [item.id]);
              }
            } catch (dbErr) {
              console.error(`[Cleanup] Gagal memperbarui DB untuk ${item.table} ID ${item.id}:`, dbErr.message);
            }
          }
          console.log('[Cleanup] Selesai menyinkronkan data database.');
        }
      }
    } catch (err) {
      console.error('[Cleanup] Gagal menjalankan pembersihan Supabase:', err.message);
    }
  }
};

// Fungsi inisialisasi penjadwal otomatis (setiap 24 jam sekali)
const startCleanupScheduler = () => {
  // Jalankan sekali saat server pertama kali start (tunda 10 detik agar koneksi DB matang)
  setTimeout(() => {
    cleanOldUploads().catch(err => console.error('[Cleanup Error]', err));
  }, 10000);

  // Jadwalkan untuk berjalan setiap 24 jam (86.400.000 ms)
  setInterval(() => {
    cleanOldUploads().catch(err => console.error('[Cleanup Error]', err));
  }, 24 * 60 * 60 * 1000);
};

module.exports = { cleanOldUploads, startCleanupScheduler };
