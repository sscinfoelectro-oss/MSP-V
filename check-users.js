const db = require('./backend/database');

console.log('📋 قائمة جميع المستخدمين المسجلين في قاعدة البيانات:');
console.log('══════════════════════════════════════════════════════════════');

const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();

users.forEach(user => {
  console.log(`
✅ ID: ${user.id}
👤 اسم المستخدم: ${user.username}
📧 البريد الالكتروني: ${user.email}
🔰 الدور: ${user.role}
📅 تاريخ الانشاء: ${user.created_at}
─────────────────────────────────────────────────────`);
});

console.log(`\n📊 مجموع المستخدمين: ${users.length} مستخدم`);