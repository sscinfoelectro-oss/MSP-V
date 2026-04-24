const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// انشاء وفتح قاعدة البيانات
const dbPath = path.join(__dirname, 'diagnostic.db');
const db = new Database(dbPath, { verbose: console.log });

// انشاء الجداول
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'ok',
    lastInspection DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS diagnostics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    resolved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS garages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    rating REAL DEFAULT 5.0,
    services TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    working_hours TEXT,
    image_url TEXT,
    source TEXT DEFAULT 'local',
    verified BOOLEAN DEFAULT 1,
    latitude REAL,
    longitude REAL,
    votes_up INTEGER DEFAULT 0,
    votes_down INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );


  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    verified BOOLEAN DEFAULT 1,
    source TEXT DEFAULT 'local',
    votes_up INTEGER DEFAULT 0,
    votes_down INTEGER DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ادخال البيانات الافتراضية اذا كانت القاعدة فارغة
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  // انشاء حساب مدير افتراضي
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (phone, password, vehicle_type, role) VALUES (?, ?, ?, ?)')
    .run('admin', hashedPassword, 'system', 'admin');

  // ادخال المركبات الافتراضية
  const insertVehicle = db.prepare('INSERT OR IGNORE INTO vehicles (id, name, year, status, lastInspection) VALUES (?, ?, ?, ?, ?)');
  insertVehicle.run('A123', 'Sedan LX', 2023, 'ok', '2026-04-01');
  insertVehicle.run('B456', 'SUV Pro', 2022, 'warning', '2026-03-24');
  insertVehicle.run('C789', 'Truck XT', 2024, 'critical', '2026-04-06');

  // ادخال اخطاء التشخيص
  const insertDiagnostic = db.prepare('INSERT OR IGNORE INTO diagnostics (vehicle_id, code, description, severity) VALUES (?, ?, ?, ?)');
  insertDiagnostic.run('A123', 'P0420', 'Catalyst system efficiency below threshold', 'medium');
  insertDiagnostic.run('A123', 'P0171', 'System too lean (Bank 1)', 'low');
  insertDiagnostic.run('B456', 'P0302', 'Cylinder 2 misfire detected', 'high');
  insertDiagnostic.run('C789', 'P0700', 'Transmission control system malfunction', 'critical');
  insertDiagnostic.run('C789', 'P0128', 'Coolant thermostat temperature below threshold', 'medium');
}

console.log('✅ قاعدة بيانات SQLite تم انشائها وتجهيزها بنجاح');

module.exports = db;