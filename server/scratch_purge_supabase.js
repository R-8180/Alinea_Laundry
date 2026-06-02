require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const pool = require('./db');

async function purgeSupabase() {
  console.log('🚀 [Supabase Purge] Memulai proses pembersihan total cloud storage...');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Kredensial Supabase belum diatur di file .env!');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const bucketName = process.env.SUPABASE_BUCKET || 'uploads_foto';

  try {
    // 1. List semua file di dalam bucket Supabase Storage
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 100 });

    if (listError) {
      throw new Error(`Gagal membaca daftar file: ${listError.message}`);
    }

    if (!files || files.length === 0 || (files.length === 1 && files[0].name === '.emptyFolderPlaceholder')) {
      console.log('✅ Bucket Supabase Storage sudah kosong. Tidak ada file untuk dihapus.');
    } else {
      // Saring nama file (singkirkan placeholder folder jika ada)
      const fileNames = files
        .map(f => f.name)
        .filter(name => name !== '.emptyFolderPlaceholder');

      if (fileNames.length > 0) {
        console.log(`[Supabase Purge] Menghapus ${fileNames.length} file dari Supabase Storage:`, fileNames);
        
        // Hapus file secara bulk
        const { data: delData, error: delError } = await supabase.storage
          .from(bucketName)
          .remove(fileNames);

        if (delError) {
          throw new Error(`Gagal menghapus file dari Storage: ${delError.message}`);
        }
        
        console.log(`🧹 [Supabase Purge] Sukses menghapus ${delData?.length || 0} file dari Supabase Storage.`);
      }
    }

    // 2. Bersihkan link gambar lama di database (orders & payments)
    console.log('[Supabase Purge] Menyinkronkan dan membersihkan database...');
    
    // Set photo_url dan delivery_proof di orders ke NULL
    const ordersRes = await pool.query(
      `UPDATE orders SET photo_url = NULL, delivery_proof = NULL, payment_proof = NULL 
       WHERE photo_url IS NOT NULL OR delivery_proof IS NOT NULL OR payment_proof IS NOT NULL`
    );
    console.log(`✅ database: Berhasil mengosongkan link gambar di ${ordersRes.rowCount} pesanan.`);

    // Set payment_proof di payments ke NULL
    const paymentsRes = await pool.query(
      `UPDATE payments SET payment_proof = NULL WHERE payment_proof IS NOT NULL`
    );
    console.log(`✅ database: Berhasil mengosongkan link bukti pembayaran di ${paymentsRes.rowCount} transaksi.`);

    console.log('\n✨ [Supabase Purge] PROSES SELESAI! Cloud storage & database Anda kini bersih total.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal menjalankan pembersihan total:', err.message);
    process.exit(1);
  }
}

purgeSupabase();
