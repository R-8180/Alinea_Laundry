require('dotenv').config();
const pool = require('./db');

const query = `
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(query)
  .then(() => {
    console.log('✅ Tabel app_settings berhasil dibuat atau sudah ada.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Gagal membuat tabel:', err);
    process.exit(1);
  });
