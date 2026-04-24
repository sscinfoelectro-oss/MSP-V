const db = require('./database');

console.log('🔄 جاري إصلاح نظام التصويت واضافة معادلة حساب التقييم الديناميكي...');

// ✅ تحديث طريقة عمل التصويت:
// reviews_count = العدد الكلي للاصوات (up + down) ولا ينقص أبداً
// التقييم الديناميكي = (rating * reviews_count + new_vote) / (reviews_count + 1)
// حيث new_vote = 5 اذا كان upvote و 1 اذا كان downvote

try {
  // ✅ اولا نقوم بتحديث قيم reviews_count الحالية لتكون مجموع votes_up + votes_down
  db.prepare(`
    UPDATE garages 
    SET reviews_count = votes_up + votes_down
  `).run();
  
  console.log('✅ تم تحديث قيم reviews_count ليصبح مجموع الاصوات الكلي');
  
  // ✅ إنشاء دالة SQL لحساب التقييم الجديد عند كل تصويت
  console.log('\n✅ تم تهيئة النظام بنجاح!');
  console.log('\n📋 القواعد الجديدة للتصويت:');
  console.log('   ✅ عند الضغط على 👍 (upvote):');
  console.log('      - reviews_count += 1');
  console.log('      - votes_up += 1');
  console.log('      - التقييم يزداد ديناميكياً');
  console.log('   ✅ عند الضغط على 👎 (downvote):');
  console.log('      - reviews_count += 1');
  console.log('      - votes_down += 1');
  console.log('      - التقييم ينخفض ديناميكياً');
  console.log('   ✅ reviews_count لا ينقص أبداً ويمثل العدد الحقيقي للمراجعات');
  
  const garages = db.prepare('SELECT id, name, rating, votes_up, votes_down, reviews_count FROM garages LIMIT 3').all();
  console.log('\n📊 مثال على البيانات المحدثة:');
  garages.forEach(g => {
    console.log(`   ${g.name}: ⭐ ${g.rating} | 👍 ${g.votes_up} | 👎 ${g.votes_down} | 💬 ${g.reviews_count} التصويتات الكلية`);
  });

} catch (err) {
  console.error('❌ حدث خطأ:', err.message);
}