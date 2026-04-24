const Database = require('better-sqlite3');
const path = require('path');

// Connect DIRECTLY to database file WITHOUT using database.js
// This bypasses the table creation that runs when importing database.js
const dbPath = path.join(__dirname, 'diagnostic.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('🔧 Database fix script starting...');
console.log('✅ Connected directly to diagnostic.db');

// ---------------------------
// First create tables if they don't exist
// ---------------------------
console.log('\\n📋 Creating tables if missing...');

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
    reviews_count INTEGER DEFAULT 0,
    working_days TEXT,
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

console.log('✅ Tables created/verified');

// ---------------------------
// Verify final state
// ---------------------------
console.log('\\n✅ Final verification:');
console.log('\\nServices columns:');
db.prepare('PRAGMA table_info(services)').all().forEach(c => console.log('  - ' + c.name));
console.log('\\nGarages columns:');
db.prepare('PRAGMA table_info(garages)').all().forEach(c => console.log('  - ' + c.name));

db.close();
console.log('\\n✅ Database fix completed!');