const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

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
app.post('/api/auth/register', (req, res) => {
  const { phone, password, carType } = req.body;

  if (!phone || !password || !carType) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
      const sqlQuery = 'INSERT INTO users (phone, password, vehicle_type, role) VALUES (?, ?, ?, ?)';
      logTime(sqlQuery);
      const result = db.prepare(sqlQuery).run(phone, hashedPassword, carType, 'user');

    const token = jwt.sign({ id: result.lastInsertRowid, phone, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: {
        id: result.lastInsertRowid,
        phone,
        vehicle_type: carType,
        role: 'user'
      }
    });
  } catch (err) {
    res.status(400).json({ error: 'رقم الهاتف مسجل بالفعل' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;

  const sqlUser = 'SELECT * FROM users WHERE phone = ?';
  logTime(sqlUser);
  const user = db.prepare(sqlUser).get(phone);
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
app.get('/api/garages', (req, res) => {
  const sqlGarages = 'SELECT * FROM garages ORDER BY rating DESC';
  logTime(sqlGarages);
  const garages = db.prepare(sqlGarages).all();
  res.json({ garages });
});

// 📍 واجهات جراجات Google Maps الخارجية
app.get('/api/garages/external', (req, res) => {
  const sqlGarages = 'SELECT * FROM garages WHERE verified = 0 AND source = "Google Maps" ORDER BY rating DESC';
  logTime(sqlGarages);
  const garages = db.prepare(sqlGarages).all();
  res.json({ garages });
});

// ✅ واجهة الموافقة على الجراج (تحويله إلى معتمد)
app.post('/api/garages/external/:id/verify', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('UPDATE garages SET verified = 1 WHERE id = ?').run(id);
    res.json({ success: true, message: '✅ تم اعتماد الجراج بنجاح' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 👍 نظام التصويت للجراجات
app.post('/api/garages/:id/vote', (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'up' or 'down'
  
  try {
    // ✅ جلب الجراج الحالي
    const garage = db.prepare('SELECT rating, reviews_count, votes_up, votes_down FROM garages WHERE id = ?').get(id);
    
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
    db.prepare('UPDATE garages SET rating = ?, reviews_count = ?, votes_up = ?, votes_down = ? WHERE id = ?')
      .run(newRating, newReviewsCount, newVotesUp, newVotesDown, id);
    
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
app.get('/api/services', (req, res) => {
  const sqlServices = 'SELECT * FROM services ORDER BY rating DESC';
  logTime(sqlServices);
  const services = db.prepare(sqlServices).all();
  res.json({ services });
});

// 👍 نظام التصويت للخدمات
app.post('/api/services/:id/vote', (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'up' or 'down'
  
  try {
    // ✅ جلب الخدمة الحالية
    const service = db.prepare('SELECT rating, reviews_count, votes_up, votes_down FROM services WHERE id = ?').get(id);
    
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
    db.prepare('UPDATE services SET rating = ?, reviews_count = ?, votes_up = ?, votes_down = ? WHERE id = ?')
      .run(newRating, newReviewsCount, newVotesUp, newVotesDown, id);
    
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
app.post('/api/admin/garages', authenticateToken, isAdmin, (req, res) => {
  const { name, location, rating, services, phone, address, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO garages (name, location, rating, services, phone, address, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      verified !== false ? 1 : 0,
      reviews_count || 0
    );
    
    res.json({ success: true, id: result.lastInsertRowid, message: '✅ Garage ajouté avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/garages/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, location, rating, services, phone, address, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  try {
    db.prepare(`
      UPDATE garages 
      SET name = ?, location = ?, rating = ?, services = ?, phone = ?, address = ?, working_hours = ?, working_days = ?, image_url = ?, latitude = ?, longitude = ?, source = ?, verified = ?, reviews_count = ?
      WHERE id = ?
    `).run(
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
      verified !== false ? 1 : 0,
      reviews_count || 0,
      id
    );
    
    res.json({ success: true, message: '✅ Garage mis à jour avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/garages/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM garages WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '✅ Garage supprimé avec succès' });
});

// ⚙️ واجهات ادارة الخدمات (للادمن فقط)
app.post('/api/admin/services', authenticateToken, isAdmin, (req, res) => {
  const { name, location, rating, description, services_list, phone, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO services (name, location, rating, description, services_list, phone, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      verified !== false ? 1 : 0,
      reviews_count || 0
    );
    
    res.json({ success: true, id: result.lastInsertRowid, message: '✅ Service ajouté avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/services/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, location, rating, description, services_list, phone, working_hours, working_days, image_url, latitude, longitude, source, verified, reviews_count } = req.body;
  
  console.log('🔧 PUT /api/admin/services/' + id, { name, location, rating, reviews_count });
  
  try {
    const result = db.prepare(`
      UPDATE services 
      SET name = ?, location = ?, rating = ?, description = ?, services_list = ?, phone = ?, working_hours = ?, working_days = ?, image_url = ?, latitude = ?, longitude = ?, source = ?, verified = ?, reviews_count = ?
      WHERE id = ?
    `).run(
      name, 
      location, 
      rating, 
      description, 
      JSON.stringify(services_list), 
      phone, 
      working_hours || null,
      working_days || null,
      image_url || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      source || 'local',
      verified !== false ? 1 : 0,
      reviews_count || 0,
      id
    );
    
    console.log('🔧 Update result:', result);
    res.json({ success: true, message: '✅ Service mis à jour avec succès' });
  } catch (err) {
    console.error('🔧 Update error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/services/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '✅ Service supprimé avec succès' });
});

// ✅ واجهة الاحصاءات العامة للجميع بدون صلاحيات (للصفحة الرئيسية و صفحة about)
app.get('/api/public/stats', (req, res) => {
  const sqlCountUsers = 'SELECT COUNT(*) as count FROM users';
  logTime(sqlCountUsers);
  const usersResult = db.prepare(sqlCountUsers).get();
  const totalUsers = usersResult ? usersResult.count : 0;

  logTime(`✅ Public stats: Users=${totalUsers}`);

  res.json({
    totalUsers
  });
});

// ⚙️ واجهات الادمن
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
  const sqlCountVehicles = 'SELECT COUNT(*) as count FROM vehicles';
  logTime(sqlCountVehicles);
  const vehiclesResult = db.prepare(sqlCountVehicles).get();
  const totalVehicles = vehiclesResult ? vehiclesResult.count : 0;

  const sqlCountUsers = 'SELECT COUNT(*) as count FROM users';
  logTime(sqlCountUsers);
  const usersResult = db.prepare(sqlCountUsers).get();
  const totalUsers = usersResult ? usersResult.count : 0;

  const sqlCountActive = 'SELECT COUNT(*) as count FROM diagnostics WHERE resolved = 0';
  logTime(sqlCountActive);
  const activeResult = db.prepare(sqlCountActive).get();
  const activeDiagnostics = activeResult ? activeResult.count : 0;

  const sqlCountCritical = "SELECT COUNT(*) as count FROM diagnostics WHERE severity = 'critical' AND resolved = 0";
  logTime(sqlCountCritical);
  const criticalResult = db.prepare(sqlCountCritical).get();
  const criticalCount = criticalResult ? criticalResult.count : 0;

  logTime(`✅ Stats: Users=${totalUsers}, Vehicles=${totalVehicles}`);

  res.json({
    totalVehicles,
    totalUsers,
    activeDiagnostics,
    criticalCount
  });
});

// ✅ واجهة الاحصاءات العامة للجميع بدون صلاحيات
app.get('/api/public/stats', (req, res) => {
  const sqlCountUsers = 'SELECT COUNT(*) as count FROM users';
  logTime(sqlCountUsers);
  const usersResult = db.prepare(sqlCountUsers).get();
  const totalUsers = usersResult ? usersResult.count : 0;

  logTime(`✅ Public stats: Users=${totalUsers}`);

  res.json({
    totalUsers
  });
});

app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
  const sqlUsers = 'SELECT id, phone, vehicle_type, role, created_at FROM users';
  logTime(sqlUsers);
  const users = db.prepare(sqlUsers).all();
  res.json({ users });
});

app.post('/api/admin/vehicles', authenticateToken, isAdmin, (req, res) => {
  const { id, name, year, status } = req.body;
  
  try {
    db.prepare('INSERT INTO vehicles (id, name, year, status, lastInspection) VALUES (?, ?, ?, ?, datetime("now"))')
      .run(id, name, year, status || 'ok');
    
    res.json({ success: true, message: 'تم اضافة المركبة بنجاح' });
  } catch (err) {
    res.status(400).json({ error: 'هذا المعرف مستخدم بالفعل' });
  }
});

app.delete('/api/admin/vehicles/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM diagnostics WHERE vehicle_id = ?').run(req.params.id);
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  
  res.json({ success: true, message: 'تم حذف المركبة بنجاح' });
});

// ✅ واجهة حذف مستخدم
app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  
  // ✅ لا نسمح بحذف الحساب الادمن الرئيسي
  if (id === 1) {
    return res.status(400).json({ error: 'لا يمكن حذف حساب المدير الرئيسي' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  logTime(`✅ المستخدم رقم ${id} تم حذفه بنجاح`);
  res.json({ success: true, message: '✅ تم حذف المستخدم بنجاح' });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    platform: 'Smart Automotive Diagnostic Platform', 
    uptime: process.uptime(),
    database: '✅ SQLite متصل بنجاح'
  });
});

app.listen(port, () => {
  logTime(`✅ Serveur démarré sur: http://localhost:${port}`);
  logTime(`✅ Base de données SQLite connectée`);
  logTime(`✅ Système d'authentification opérationnel`);
  logTime(`✅ Tableau de bord administrateur prêt`);
  console.log(`\n📌 Compte administrateur par défaut: admin / admin123\n`);
});
