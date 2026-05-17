const { Pool } = require('pg');
require('dotenv').config();

console.log('⏳ Menghubungkan ke PostgreSQL...');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST.includes('supabase') ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('⏳ Membuat tabel users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'customer',
        address VARCHAR(255),
        phone VARCHAR(20),
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('⏳ Membuat tabel addresses...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(100),
        address TEXT NOT NULL,
        lat DECIMAL(10,8),
        lng DECIMAL(11,8),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('⏳ Membuat tabel couriers...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS couriers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'available'
      );
    `);
    
    console.log('⏳ Membuat tabel orders...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        courier_id INTEGER REFERENCES users(id),
        order_code VARCHAR(20) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'menunggu',
        total_price INTEGER DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'pending',
        address VARCHAR(255),
        address_id INTEGER,
        notes TEXT,
        photo_url VARCHAR(255),
        service_speed VARCHAR(20) DEFAULT 'reguler',
        estimated_days INTEGER DEFAULT 0,
        estimated_hours INTEGER DEFAULT 0,
        estimated_start TIMESTAMP,
        express_fee INTEGER DEFAULT 0,
        voucher_code VARCHAR(20),
        discount INTEGER DEFAULT 0,
        delivery_proof VARCHAR(255),
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('⏳ Membuat tabel services...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        time_days INTEGER DEFAULT 0,
        time_hours INTEGER DEFAULT 0,
        unit_type VARCHAR(10) DEFAULT 'kg',
        price_per_unit DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('⏳ Membuat tabel order_items...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
        service_type VARCHAR(20) DEFAULT 'kiloan',
        name VARCHAR(100),
        notes TEXT,
        weight DECIMAL(5,2) DEFAULT 0,
        qty_items INTEGER DEFAULT 0,
        price_per_unit INTEGER DEFAULT 0,
        parfum VARCHAR(50),
        parfum_price INTEGER DEFAULT 0
      );
    `);
    
    console.log('⏳ Membuat tabel payments...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER UNIQUE REFERENCES orders(id),
        payment_proof VARCHAR(255),
        validated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('⏳ Membuat tabel vouchers...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        code VARCHAR(20) UNIQUE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('⏳ Membuat indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);');
    
    await client.query('COMMIT');
    console.log('✅ Migrasi database PostgreSQL sukses!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migrasi gagal:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Koneksi gagal:', err.message);
  process.exit(1);
});
