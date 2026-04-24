const db = require('./database');

console.log('⏳ جارٍ تحديث جدول الجراجات...');

try {
  db.exec(`ALTER TABLE garages ADD COLUMN image_url TEXT`);
  console.log('✅ تم إضافة عمود image_url');
} catch(e) { console.log('ℹ️ عمود image_url موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN source TEXT DEFAULT 'local'`);
  console.log('✅ تم إضافة عمود source');
} catch(e) { console.log('ℹ️ عمود source موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN verified BOOLEAN DEFAULT 1`);
  console.log('✅ تم إضافة عمود verified');
} catch(e) { console.log('ℹ️ عمود verified موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN latitude REAL`);
  console.log('✅ تم إضافة عمود latitude');
} catch(e) { console.log('ℹ️ عمود latitude موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN longitude REAL`);
  console.log('✅ تم إضافة عمود longitude');
} catch(e) { console.log('ℹ️ عمود longitude موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN votes_up INTEGER DEFAULT 0`);
  console.log('✅ تم إضافة عمود votes_up');
} catch(e) { console.log('ℹ️ عمود votes_up موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN votes_down INTEGER DEFAULT 0`);
  console.log('✅ تم إضافة عمود votes_down');
} catch(e) { console.log('ℹ️ عمود votes_down موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN working_hours TEXT`);
  console.log('✅ تم إضافة عمود working_hours');
} catch(e) { console.log('ℹ️ عمود working_hours موجود بالفعل'); }

try {
  db.exec(`ALTER TABLE garages ADD COLUMN working_days TEXT`);
  console.log('✅ تم إضافة عمود working_days');
} catch(e) { console.log('ℹ️ عمود working_days موجود بالفعل'); }

console.log('✅ تم تحديث جدول الجراجات بنجاح!');
