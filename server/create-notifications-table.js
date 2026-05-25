const pool = require('./db');

async function createTable() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    console.log('⏳ Creating notifications table...');
    await pool.query(queryText);
    console.log('✅ Notifications table created successfully!');
  } catch (error) {
    console.error('❌ Error creating notifications table:', error);
  } finally {
    await pool.end();
  }
}

createTable();
