const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('⏳ Starting branches migration...');
    await client.query('BEGIN');

    // 1. Create branches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        address TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created branches table');

    // 2. Add branch_id to users if it doesn't exist
    const userCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'branch_id';
    `);
    if (userCols.rows.length === 0) {
      await client.query(`
        ALTER TABLE users ADD COLUMN branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added branch_id column to users table');
    } else {
      console.log('ℹ️ branch_id column already exists in users table');
    }

    // 3. Add branch_id to orders if it doesn't exist
    const orderCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'branch_id';
    `);
    if (orderCols.rows.length === 0) {
      await client.query(`
        ALTER TABLE orders ADD COLUMN branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added branch_id column to orders table');
    } else {
      console.log('ℹ️ branch_id column already exists in orders table');
    }

    // 4. Insert initial branches
    const branches = [
      { name: 'Sampangan', address: 'Jl. Sampangan Raya No. 12, Semarang', phone: '081234567891' },
      { name: 'Unnes', address: 'Jl. Unnes Raya No. 45, Sekaran, Gunungpati, Semarang', phone: '081234567892' },
      { name: 'Tlogosari', address: 'Jl. Tlogosari Raya No. 78, Semarang', phone: '081234567893' }
    ];

    for (const branch of branches) {
      await client.query(`
        INSERT INTO branches (name, address, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET address = $2, phone = $3;
      `, [branch.name, branch.address, branch.phone]);
    }
    console.log('✅ Seeded default branches: Sampangan, Unnes, Tlogosari');

    await client.query('COMMIT');
    console.log('🎉 Branches migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
