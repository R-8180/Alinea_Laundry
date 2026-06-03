const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db');

async function run() {
  console.log("⏳ Menghubungkan ke database untuk migrasi indeks performa...");
  try {
    // Jalankan satu per satu
    console.log("⏳ Membuat idx_orders_branch...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);');

    console.log("⏳ Membuat idx_orders_created_at...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);');

    console.log("⏳ Membuat idx_order_items_order_id...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);');

    console.log("⏳ Membuat idx_financial_records_branch...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_financial_records_branch ON financial_records(branch_id);');

    console.log("⏳ Membuat idx_financial_records_date...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);');

    console.log("⏳ Membuat idx_notifications_user...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);');

    console.log("⏳ Membuat idx_push_subscriptions_user...");
    await pool.query('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);');

    console.log("✅ Semua indeks performa berhasil diverifikasi/dibuat!");

    // Verifikasi dengan list indexes
    const indexesRes = await pool.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE indexname IN (
        'idx_orders_branch', 
        'idx_orders_created_at', 
        'idx_order_items_order_id', 
        'idx_financial_records_branch', 
        'idx_financial_records_date', 
        'idx_notifications_user', 
        'idx_push_subscriptions_user'
      )
    `);
    console.log("\nIndeks yang aktif:");
    console.table(indexesRes.rows);

  } catch (err) {
    console.error("❌ Gagal membuat indeks database:", err);
  } finally {
    await pool.end();
  }
}

run();
