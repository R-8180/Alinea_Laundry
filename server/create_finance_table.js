const pool = require('./db');

async function createTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS financial_records (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        amount INTEGER NOT NULL,
        description TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    console.log('financial_records table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

createTable();
