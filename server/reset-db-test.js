require('dotenv').config();
const pool = require('./db');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const useSupabase = isVercel || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

const resetData = async () => {
  console.log('⚡ [Reset System] Memulai proses reset data aplikasi...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Kosongkan semua tabel transaksi, notifikasi, feedback, review, dan voucher
    // Menggunakan TRUNCATE dengan CASCADE untuk menangani foreign key secara otomatis dan bersih
    console.log('⚙️ [Reset DB] Mengosongkan tabel transaksi...');
    await client.query(`
      TRUNCATE TABLE 
        payments, 
        notifications, 
        push_subscriptions, 
        feedback_saran, 
        vouchers, 
        order_items, 
        orders,
        financial_records
      CASCADE;
    `);

    // 2. Reset poin semua user ke 0 (menjaga akun tetap ada)
    console.log('⚙️ [Reset DB] Mereset poin semua akun user ke 0...');
    await client.query('UPDATE users SET points = 0;');

    await client.query('COMMIT');
    console.log('✅ [Reset DB] Database berhasil di-reset! Semua akun user tetap aman.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Reset DB] Gagal melakukan reset database:', err.message);
  } finally {
    client.release();
  }

  // 3. Hapus Semua File Upload Lokal
  console.log('📁 [Reset Storage] Menghapus file unggahan lokal...');
  const uploadDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadDir)) {
    try {
      const files = fs.readdirSync(uploadDir);
      let localDeletedCount = 0;
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        // Pastikan tidak menghapus placeholder penting jika ada
        if (file !== '.gitkeep' && file !== '.empty') {
          try {
            fs.unlinkSync(filePath);
            localDeletedCount++;
          } catch (err) {
            console.error(`[Reset Storage] Gagal menghapus file lokal ${file}:`, err.message);
          }
        }
      });
      console.log(`✅ [Reset Storage] Selesai menghapus ${localDeletedCount} file lokal.`);
    } catch (err) {
      console.error('[Reset Storage] Gagal mengakses direktori uploads:', err.message);
    }
  }

  // 4. Hapus Semua File di Supabase Storage (jika diaktifkan)
  if (useSupabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    console.log('☁️ [Reset Cloud] Menghapus file unggahan di Supabase Storage...');
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const bucketName = process.env.SUPABASE_BUCKET || 'uploads_foto';

      // List semua file di bucket
      const { data: fileList, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 1000 });

      if (listError) {
        throw listError;
      }

      if (fileList && fileList.length > 0) {
        const filenames = fileList
          .map(f => f.name)
          .filter(name => name !== '.emptyFolderPlaceholder');

        if (filenames.length > 0) {
          console.log(`[Reset Cloud] Menghapus ${filenames.length} file dari bucket Supabase: ${bucketName}...`);
          const { data: delData, error: delError } = await supabase.storage
            .from(bucketName)
            .remove(filenames);

          if (delError) {
            throw delError;
          }
          console.log(`✅ [Reset Cloud] Berhasil menghapus ${delData?.length || 0} file dari Supabase Storage.`);
        } else {
          console.log('✅ [Reset Cloud] Supabase Storage sudah bersih.');
        }
      } else {
        console.log('✅ [Reset Cloud] Supabase Storage sudah bersih.');
      }
    } catch (err) {
      console.error('❌ [Reset Cloud] Gagal mengosongkan Supabase Storage:', err.message);
    }
  }

  console.log('🎉 [Reset System] PROSES RESET SELESAI DENGAN SUKSES! Aplikasi sekarang kembali ke kondisi bersih.');
  process.exit(0);
};

// Jalankan script
resetData();
