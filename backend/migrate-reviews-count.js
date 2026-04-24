const db = require('./database');

console.log('🔄 جاري تحديث جدول الجراجات واضافة عمود reviews_count...');

try {
  // التحقق أولا مما إذا كان العمود موجود بالفعل
  const tableInfo = db.prepare('PRAGMA table_info(garages)').all();
  const columnExists = tableInfo.some(col => col.name === 'reviews_count');

  if (!columnExists) {
    // إضافة العمود مع القيمة الافتراضية 0
    db.prepare(`
      ALTER TABLE garages 
      ADD COLUMN reviews_count INTEGER DEFAULT 0
    `).run();
    
    console.log('✅ تم إضافة عمود reviews_count بنجاح');

    // تحديث القيم الحالية حسابياً = votes_up - votes_down (ولكن لا يقل عن 0)
    db.prepare(`
      UPDATE garages 
      SET reviews_count = MAX(0, votes_up - votes_down)
    `).run();
    
    console.log('✅ تم تحديث قيم reviews_count للجراجات الموجودة بنجاح');
  } else {
    console.log('ℹ️ عمود reviews_count موجود بالفعل، لا حاجة للتحديث');
  }

  // عرض النتيجة النهائية
  const garages = db.prepare('SELECT id, name, votes_up, votes_down, reviews_count FROM garages LIMIT 5').all();
  console.log('\n📊 مثال على البيانات المحدثة:');
  garages.forEach(g => {
    console.log(`   ${g.name}: 👍 ${g.votes_up} 👎 ${g.votes_down} 💬 ${g.reviews_count}`);
  });

  console.log('\n✅ عملية التحديث اكتملت بنجاح!');

} catch (err) {
  console.error('❌ حدث خطأ أثناء التحديث:', err.message);
  process.exit(1);
}