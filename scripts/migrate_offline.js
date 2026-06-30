const pool = require('./server/db');

async function migrate() {
  try {
    console.log('Starting offline orders migration...');
    
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255);
    `);
    
    console.log('Successfully added offline columns to orders table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
