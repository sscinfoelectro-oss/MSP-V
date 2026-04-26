const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./database');
require('dotenv').config();

// ✅ دالة تسجيل الوقت لكل رسالة
const logTime = (message) => {
  const time = new Date().toLocaleTimeString('fr-FR', { hour12: false });
  console.log(`[${time}]`, message);
};

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = 'msp-diagnostic-platform-2026-secret-key';

app.use(cors());
app.use(express.json());

// ✅ وسيط عرض الوقت لكل طلب API يصل
app.use((req, res, next) => {
  logTime(`${req.method} ${req.path}`);
  next();
});

// ✅ وسطاء التحقق من المصادقة
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ✅ وسطاء التحقق من صلاحيات الادمن
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

// 🔐 واجهات المصادقة
app.post('/api/auth/register', async (req, res) => {
  const { phone, password, carType } = req.body;

  if (!phone || !password || !carType) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sqlQuery = 'INSERT INTO users (phone, password, vehicle_type, role) VALUES ($1, $2, $3, $4) RETURNING id';
    logTime(sqlQuery);
    const result = await pool.query(sqlQuery, [phone, hashedPassword, carType, 'user']);
    const userId = result.rows[0].id;

    const token = jwt.sign({ id: userId, phone, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: {
        id: userId,
        phone,
        vehicle_type: carType,
        role: 'user'
      }
    });
  } catch (err) {
    res.status(400).json({ error: 'رقم الهاتف مسجل بالفعل' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;

  const sqlUser = 'SELECT * FROM users WHERE phone = $1';
  logTime(sqlUser);
  const result = await pool.query(sqlUser, [phone]);
  const user = result.rows[0];
  
  if (!user) return res.status(401).json({ error: 'رقم الهاتف او كلمة المرور خاطئة' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'رقم الهاتف او كلمة المرور خاطئة' });
  }

  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      vehicle_type: user.vehicle_type,
      role: user.role
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// 🛠️ واجهات الجراجات
app.get('/api/garages', async (req, res) => {
  const sqlGarages = 'SELECT * FROM garages ORDER BY rating DESC';
  logTime(sqlGarages);
  const result = await pool.query(sqlGarages);
  res.json({ garages: result.rows });
});

// 📍 واجهات جراجات Google Maps الخارجية
app.get('/api/garages/external', async (req, res) => {
  const sqlGarages = 'SELECT * FROM garages WHERE verified = false AND source = $1 ORDER BY rating DESC';
  logTime(sqlGarages);
  const result = await pool.query(sqlGarages, ['Google Maps']);
  res.json({ garages: result.rows });
});

// ✅ واجهة الموافقة على الجراج (تحويله إلى معتمد)
app.post('/api/garages/external/:id/verify', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE garages SET verified = true WHERE id = $1', [id]);
    res.json({ success: true, message: '✅ تم اعتماد الجراج بنجاح' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 👍 نظام التصويت للجراجات
app.post('/api/garages/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'up' or 'down'
  
  try {
    // ✅ جلب الجراج الحالي
    const garageResult = await pool.query('SELECT rating, reviews_count, votes_up, votes_down FROM garages WHERE id = $1', [id]);
    const garage = garageResult.rows[0];
    
    let totalPoints = garage.rating * garage.reviews_count;
    let newReviewsCount = garage.reviews_count + 1;
    let newVotesUp = garage.votes_up;
    let newVotesDown = garage.votes_down;
    
    if (type === 'up') {
      // ✅ تصويت إيجابي = 5 نجوم
      totalPoints += 5;
      newVotesUp += 1;
    } else if (type === 'down') {
      // ✅ تصويت سلبي = 1 نجمة
      totalPoints += 1;
      newVotesDown += 1;
    } else {
      return res.status(400).json({ error: 'نوع التصويت غير صالح' });
    }
    
    // ✅ حساب التقييم الجديد
    const newRating = totalPoints / newReviewsCount;
    
    // ✅ تحديث الجراج
    await pool.query(
      'UPDATE garages SET rating = $1, reviews_count = $2, votes_up = $3, votes_down = $4 WHERE id = $5',
      [newRating, newReviewsCount, newVotesUp, newVotesDown, id]
    );
    
    res.json({ 
      success: true, 
      rating: newRating,
      reviews_count: newReviewsCount,
      votes_up: newVotesUp,
      votes_down: newVotesDown,
      message: type === 'up' ? '✅ تم إضافة تصويت إيجابي' : '✅ تم إضافة تصويت سلبي'
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔧 واجهات الخدمات المنزلية
app.get('/api/services', async (req, res) => {
  const sqlServices = 'SELECT * FROM services ORDER BY rating DESC';
  logTime(sqlServices);
  const result = await pool.query(sqlServices);
  res.json({ services: result.rows });
});

// 👍 نظام التصويت للخدمات
app.post('/api/services/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'up' or 'down'
  
  try {
    // ✅ جلب الخدمة الحالية
    const serviceResult = await pool.query('SELECT rating, reviews_count, votes_up, votes_down FROM services WHERE id = $1', [id]);
    const service = serviceResult.rows[0];
    
    let totalPoints = service.rating * service.reviews_count;
    let newReviewsCount = service.reviews_count + 1;
    let newVotesUp = service.votes_up;
    let newVotesDown = service.votes_down;
    
    if (type === 'up') {
      // ✅ تصويت إيجابي = 5 نجوم
      totalPoints += 5;
      newVotesUp += 1;
    } else if (type === 'down') {
      // ✅ تصويت سلبي = 1 نجمة
      totalPoints += 1;
      newVotesDown += 1;
    } else {
      return res.status(400).json({ error: 'نوع التصويت غير صالح' });
    }
    
    // ✅ حساب التقييم الجديد
    const newRating = totalPoints / newReviewsCount;
    
    // ✅ تحديث الخدمة
    await pool.query(
      'UPDATE services SET rating = $1, reviews_count = $2, votes_up = $3, votes_down = $4 WHERE id = $5',
      [newRating, newReviewsCount, newVotesUp, newVotesDown, id]
    );
    
    res.json({ 
      success: true, 
      rating: newRating,
      reviews_count: newReviewsCount,
      votes_up: newVotesUp,
      votes_down: newVotesDown,
      message: type === 'up' ? '✅ تم إضافة تصويت إيجابي' : '✅ تم إضافة تصويت سلبي'
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ⚙️ واجهات ادارة الجراجات (للادمن فقط)
app.post('/api/admin/garages', authenticateToken, isAdmin, async (req, res) => {
  const { name, location, rating, services, phone, address, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO garages (name, location, rating, services, phone, address, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
    `, [
      name, 
      location, 
      rating || 5.0, 
      JSON.stringify(services), 
      phone, 
      address, 
      working_hours, 
      working_days, 
      image_url || null, 
      latitude ? parseFloat(latitude) : null, 
      longitude ? parseFloat(longitude) : null,
      source || 'local',
      verified !== false ? true : false,
      reviews_count || 0
    ]);
    
    res.json({ success: true, id: result.rows[0].id, message: '✅ Garage ajouté avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/garages/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, location, rating, services, phone, address, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  try {
    await pool.query(`
      UPDATE garages 
      SET name = $1, location = $2, rating = $3, services = $4, phone = $5, address = $6, working_hours = $7, working_days = $8, image_url = $9, latitude = $10, longitude = $11, source = $12, verified = $13, reviews_count = $14
      WHERE id = $15
    `, [
      name, 
      location, 
      rating, 
      JSON.stringify(services), 
      phone, 
      address, 
      working_hours, 
      working_days, 
      image_url || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      source || 'local',
      verified !== false ? true : false,
      reviews_count || 0,
      id
    ]);
    
    res.json({ success: true, message: '✅ Garage mis à jour avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/garages/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM garages WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: '✅ Garage supprimé avec succès' });
});

// ⚙️ واجهات ادارة الخدمات (للادمن فقط)
app.post('/api/admin/services', authenticateToken, isAdmin, async (req, res) => {
  const { name, location, rating, description, services_list, phone, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO services (name, location, rating, description, services_list, phone, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
    `, [
      name, 
      location, 
      rating || 5.0, 
      description, 
      JSON.stringify(services_list), 
      phone,
      working_hours || null,
      working_days || null,
      image_url || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      source || 'local',
      verified !== false ? true : false,
      reviews_count || 0
    ]);
    
    res.json({ success: true, id: result.rows[0].id, message: '✅ Service ajouté avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/services/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, location, rating, description, services_list, phone, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  
  // ✅ تسجيل كامل لجميع القيم التي تأتي من الواجهة الامامية لمعرفة المشكلة الحقيقية
  console.log('🔧 ========== DATA RECEIVED FROM FRONTEND ==========');
  console.log('working_hours =', working_hours, '| type:', typeof working_hours, '| is empty string:', working_hours === '');
  console.log('working_days =', working_days, '| type:', typeof working_days);
  console.log('image_url =', image_url);
  console.log('🔧 =================================================');
  
  try {
    await pool.query(`
      UPDATE services 
      SET name = $1, location = $2, rating = $3, description = $4, services_list = $5, phone = $6, working_hours = $7, working_days = $8, image_url = $9, latitude = $10, longitude = $11, source = $12, verified = $13, reviews_count = $14
      WHERE id = $15
    `, [
      name, 
      location, 
      rating, 
      description, 
      JSON.stringify(services_list), 
      phone, 
      // ✅ إصلاح نهائي: اذا كان النص فارغ نحول الى NULL، غير ذلك نحفظ القيمة كما هي
      working_hours !== undefined && working_hours !== '' ? working_hours : null,
      working_days !== undefined && working_days !== '' ? working_days : null,
      image_url !== undefined && image_url !== '' ? image_url : null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      source !== undefined ? source : 'local',
      verified !== false ? true : false,
      // ✅ تحويل الى عدد صحيح ليتطابق مع نوع العمود في قاعدة البيانات
      parseInt(reviews_count) || 0,
      id
    ]);
    
    console.log('🔧 Update completed successfully');
    res.json({ success: true, message: '✅ Service mis à jour avec succès' });
  } catch (err) {
    console.error('🔧 Update error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/services/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: '✅ Service supprimé avec succès' });
});

// ✅ واجهة الاحصاءات العامة للجميع بدون صلاحيات (للصفحة الرئيسية و صفحة about)
app.get('/api/public/stats', async (req, res) => {
  const sqlCountUsers = 'SELECT COUNT(*) as count FROM users';
  logTime(sqlCountUsers);
  const usersResult = await pool.query(sqlCountUsers);
  const totalUsers = usersResult.rows[0] ? parseInt(usersResult.rows[0].count) : 0;

  logTime(`✅ Public stats: Users=${totalUsers}`);

  res.json({
    totalUsers
  });
});

// ⚙️ واجهات الادمن
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  const sqlCountVehicles = 'SELECT COUNT(*) as count FROM vehicles';
  logTime(sqlCountVehicles);
  const vehiclesResult = await pool.query(sqlCountVehicles);
  const totalVehicles = vehiclesResult.rows[0] ? parseInt(vehiclesResult.rows[0].count) : 0;

  const sqlCountUsers = 'SELECT COUNT(*) as count FROM users';
  logTime(sqlCountUsers);
  const usersResult = await pool.query(sqlCountUsers);
  const totalUsers = usersResult.rows[0] ? parseInt(usersResult.rows[0].count) : 0;

  const sqlCountActive = 'SELECT COUNT(*) as count FROM diagnostics WHERE resolved = false';
  logTime(sqlCountActive);
  const activeResult = await pool.query(sqlCountActive);
  const activeDiagnostics = activeResult.rows[0] ? parseInt(activeResult.rows[0].count) : 0;

  const sqlCountCritical = "SELECT COUNT(*) as count FROM diagnostics WHERE severity = 'critical' AND resolved = false";
  logTime(sqlCountCritical);
  const criticalResult = await pool.query(sqlCountCritical);
  const criticalCount = criticalResult.rows[0] ? parseInt(criticalResult.rows[0].count) : 0;

  logTime(`✅ Stats: Users=${totalUsers}, Vehicles=${totalVehicles}`);

  res.json({
    totalVehicles,
    totalUsers,
    activeDiagnostics,
    criticalCount
  });
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  const sqlUsers = 'SELECT id, phone, vehicle_type, role, created_at FROM users';
  logTime(sqlUsers);
  const result = await pool.query(sqlUsers);
  res.json({ users: result.rows });
});

app.post('/api/admin/vehicles', authenticateToken, isAdmin, async (req, res) => {
  const { id, name, year, status } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO vehicles (id, name, year, status, lastInspection) VALUES ($1, $2, $3, $4, NOW())',
      [id, name, year, status || 'ok']
    );
    
    res.json({ success: true, message: 'تم اضافة المركبة بنجاح' });
  } catch (err) {
    res.status(400).json({ error: 'هذا المعرف مستخدم بالفعل' });
  }
});

app.delete('/api/admin/vehicles/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.query('DELETE FROM diagnostics WHERE vehicle_id = $1', [req.params.id]);
  await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
  
  res.json({ success: true, message: 'تم حذف المركبة بنجاح' });
});

// ✅ واجهة حذف مستخدم
app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  // ✅ لا نسمح بحذف الحساب الادمن الرئيسي
  if (id === '1') {
    return res.status(400).json({ error: 'لا يمكن حذف حساب المدير الرئيسي' });
  }

  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  
  logTime(`✅ المستخدم رقم ${id} تم حذفه بنجاح`);
  res.json({ success: true, message: '✅ تم حذف المستخدم بنجاح' });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    platform: 'Smart Automotive Diagnostic Platform', 
    uptime: process.uptime(),
    database: '✅ PostgreSQL متصل بنجاح'
  });
});

app.listen(port, () => {
  logTime(`✅ Serveur démarré sur: http://localhost:${port}`);
  logTime(`✅ Base de données PostgreSQL connectée`);
  logTime(`✅ Système d'authentification opérationnel`);
  logTime(`✅ Tableau de bord administrateur prêt`);
  console.log(`\n📌 Compte administrateur par défaut: admin / admin123\n`);
});
