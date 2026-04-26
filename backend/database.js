const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// اتصال بقاعدة بيانات PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// دالة لانشاء الجداول
async function initializeDatabase() {
  try {
    // انشاء الجداول
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        year INTEGER NOT NULL,
        status TEXT DEFAULT 'ok',
        lastInspection TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS diagnostics (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS garages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        rating REAL DEFAULT 5.0,
        services TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        working_hours TEXT,
        image_url TEXT,
        source TEXT DEFAULT 'local',
        verified BOOLEAN DEFAULT true,
        latitude REAL,
        longitude REAL,
        votes_up INTEGER DEFAULT 0,
        votes_down INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        rating REAL DEFAULT 5.0,
        description TEXT,
        services_list TEXT NOT NULL,
        phone TEXT,
        working_hours TEXT,
        working_days TEXT,
        image_url TEXT,
        latitude REAL,
        longitude REAL,
        verified BOOLEAN DEFAULT true,
        source TEXT DEFAULT 'local',
        votes_up INTEGER DEFAULT 0,
        votes_down INTEGER DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ادخال البيانات الافتراضية اذا كانت القاعدة فارغة
    const userResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userResult.rows[0].count);

    if (userCount === 0) {
      // انشاء حساب مدير افتراضي
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await pool.query(
        'INSERT INTO users (phone, password, vehicle_type, role) VALUES ($1, $2, $3, $4)',
        ['admin', hashedPassword, 'system', 'admin']
      );

      // ادخال المركبات الافتراضية
      const defaultVehicles = [
        ['A123', 'Sedan LX', 2023, 'ok', '2026-04-01'],
        ['B456', 'SUV Pro', 2022, 'warning', '2026-03-24'],
        ['C789', 'Truck XT', 2024, 'critical', '2026-04-06']
      ];

      for (const vehicle of defaultVehicles) {
        await pool.query(
          'INSERT INTO vehicles (id, name, year, status, lastInspection) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          vehicle
        );
      }

      // ادخال اخطاء التشخيص
      const defaultDiagnostics = [
        ['A123', 'P0420', 'Catalyst system efficiency below threshold', 'medium'],
        ['A123', 'P0171', 'System too lean (Bank 1)', 'low'],
        ['B456', 'P0302', 'Cylinder 2 misfire detected', 'high'],
        ['C789', 'P0700', 'Transmission control system malfunction', 'critical'],
        ['C789', 'P0128', 'Coolant thermostat temperature below threshold', 'medium']
      ];

      for (const diagnostic of defaultDiagnostics) {
        await pool.query(
          'INSERT INTO diagnostics (vehicle_id, code, description, severity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          diagnostic
        );
      }
    }

    console.log('✅ قاعدة بيانات PostgreSQL تم انشائها وتجهيزها بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
  }
}

// تهيئة قاعدة البيانات عند تشغيل التطبيق
initializeDatabase();

module.exports = pool;