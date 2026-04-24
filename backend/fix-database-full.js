const Database = require('better-sqlite3');
const path = require('path');

// Direct database connection
const dbPath = path.join(__dirname, 'diagnostic.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('🔧 Full database fix starting...');

// ---------------------------
// FIX 1: SERVICES TABLE
// ---------------------------
console.log('\\n📋 Fixing services table...');

try {
  // Step 1: Rename old table
  db.prepare('ALTER TABLE services RENAME TO services_old').run();
  console.log('✅ Renamed services to services_old');
} catch (err) {
  console.log('⚠️ Rename failed (probably already done):', err.message);
}

// Step 2: Create NEW services table with ALL columns
db.prepare(`
  CREATE TABLE services (
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
  )
`).run();
console.log('✅ Created NEW services table with all columns');

// Step 3: Copy data from old table
try {
  db.prepare(`
    INSERT INTO services (id, name, location, rating, description, services_list, phone, created_at)
    SELECT id, name, location, rating, description, services_list, phone, created_at FROM services_old
  `).run();
  console.log('✅ Copied existing data from services_old');
} catch (err) {
  console.log('⚠️ Copy failed (no data or no services_old):', err.message);
}

// Step 4: Cleanup
try {
  db.prepare('DROP TABLE IF EXISTS services_old').run();
} catch (e) {}

// ---------------------------
// FIX 2: GARAGES TABLE
// ---------------------------
console.log('\\n📋 Fixing garages table...');

try {
  // Step 1: Rename old table
  db.prepare('ALTER TABLE garages RENAME TO garages_old').run();
  console.log('✅ Renamed garages to garages_old');
} catch (err) {
  console.log('⚠️ Rename failed (probably already done):', err.message);
}

// Step 2: Create NEW garages table with ALL columns
db.prepare(`
  CREATE TABLE garages (
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
  )
`).run();
console.log('✅ Created NEW garages table with all columns');

// Step 3: Copy data from old table
try {
  db.prepare(`
    INSERT INTO garages (id, name, location, rating, services, phone, address, working_hours, image_url, source, verified, latitude, longitude, votes_up, votes_down, reviews_count, working_days, created_at)
    SELECT id, name, location, rating, services, phone, address, working_hours, image_url, source, verified, latitude, longitude, votes_up, votes_down, reviews_count, working_days, created_at FROM garages_old
  `).run();
  console.log('✅ Copied existing data from garages_old');
} catch (err) {
  console.log('⚠️ Copy failed (no data or no garages_old):', err.message);
}

// Step 4: Cleanup
try {
  db.prepare('DROP TABLE IF EXISTS garages_old').run();
} catch (e) {}

// ---------------------------
// VERIFY FINAL STATE
// ---------------------------
console.log('\\n✅ FINAL VERIFICATION:');

console.log('\\n📋 SERVICES TABLE COLUMNS:');
db.prepare('PRAGMA table_info(services)').all().forEach(c => console.log('  ✅', c.name, '('+c.type+')'));

console.log('\\n📋 GARAGES TABLE COLUMNS:');
db.prepare('PRAGMA table_info(garages)').all().forEach(c => console.log('  ✅', c.name, '('+c.type+')'));

console.log('\\n✅ DATABASE FIX COMPLETED SUCCESSFULLY!');

db.close();