 import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import heroBg from './assets/garage-bg.jpeg'
import logo from './assets/ssc-logo.png'

const navItems = [
  { label: 'Accueil', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Garages', to: '/garages' },
  { label: 'Connexion', to: '/connexion' },
  { label: "S'inscrire", to: '/inscription' },
  { label: 'À propos', to: '/about' },
]
// ✅ تم حذف الاكواد الغير مستخدمة تماما

// ✅ القائمة العلويه المشتركة لجميع الصفحات
const AppHeader = ({ subTitle, hideAccueil = false }) => {
  const [userData, setUserData] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const savedUser = localStorage.getItem('user_data')
    if (savedUser) {
      setUserData(JSON.parse(savedUser))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user_token')
    localStorage.removeItem('user_data')
    setUserData(null)
    navigate('/')
    window.location.reload()
  }

  // ✅ اسلوب للزر النشط باللون الاحمر مع التوهج
  const activeStyle = {
    color: '#ff0000',
    fontWeight: 'bold',
    textShadow: '0 0 8px #ff0000, 0 0 15px #ff0000'
  }

  return (
    <header className="header-bar">
      <div className="brand-card">
        <span className="brand-logo">MechanicSmart</span>
        {subTitle && <span className="brand-sub">{subTitle}</span>}
      </div>
      <nav className="nav-links">
        {userData ? (
          <>
            {/* ✅ ابقي هذه الازرار ظاهرة حتى بعد تسجيل الدخول */}
            {!hideAccueil && <Link to="/" style={location.pathname === '/' ? activeStyle : {}}>Accueil</Link>}
            <Link to="/services" style={location.pathname === '/services' ? activeStyle : {}}>Services</Link>
            <Link to="/garages" style={location.pathname === '/garages' ? activeStyle : {}}>Garages</Link>
            <span style={{color: '#f87171', fontWeight: 'bold', marginLeft: '20px', marginRight: '15px'}}>
              🚗 {userData.vehicle_type} | 📱 {userData.phone}
            </span>
            <button onClick={handleLogout} style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0',
              fontSize: '1rem'
            }}>
              Déconnexion
            </button>
            <Link to="/about" style={{marginLeft: '15px', ...(location.pathname === '/about' ? activeStyle : {})}}>À propos</Link>
          </>
        ) : (
          navItems.map((item) => {
            // ✅ انزع زر Accueil فقط من الصفحة الرئيسية حتى للزوار
            if (hideAccueil && item.label === 'Accueil') return null;
            return item.to ? (
              <Link key={item.label} to={item.to} style={location.pathname === item.to ? activeStyle : {}}>{item.label}</Link>
            ) : (
              <a key={item.label} href={item.href}>{item.label}</a>
            )
          })
        )}
      </nav>
    </header>
  )
}

function HomePage({ stats, garages, services }) {

  return (
    <div className="page-shell">
      <AppHeader hideAccueil={true} />

      <section className="hero-section" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="hero-overlay" />
        <div className="hero-copy">
          <div className="hero-logo-wrap">
            <img src={logo} alt="SSC Maintenance logo" className="hero-logo" />
          </div>

          <h1 className="hero-title" data-text="Entretienez votre véhicule en toute simplicité">Entretienez votre véhicule en toute simplicité</h1>
          <p className="hero-description">Réservez un garage, suivez le diagnostic en temps réel et profitez d'un service automobile fiable près de chez vous.</p>
          <div className="hero-actions">
            <Link to="/garages">
              <button className="hero-glow-btn">
                <span>Trouver un garage</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

         <section className="diagnostic-section">
           <div className="section-heading">
             <h2>Chiffres clés de MechanicSmart</h2>
             <p>Découvrez les statistiques en temps réel de notre plateforme automobile.</p>
           </div>
           <div className="cards-grid">
             <div className="stats-card">
               <h3>{stats.totalUsers || 0}</h3>
               <p>Utilisateurs</p>
             </div>
             <div className="stats-card">
               <h3>{garages.length}</h3>
               <p>Garages enregistrés</p>
             </div>
             <div className="stats-card">
               <h3>{services.length}</h3>
               <p>Services à domicile</p>
             </div>
           </div>
      </section>
    </div>
  )
}

function ServicesFinder() {
  const [search, setSearch] = useState('')
  const [services, setServices] = useState([])
  const [filteredServices, setFilteredServices] = useState([])
  const [loading, setLoading] = useState(true)

  // ✅ جلب الخدمات الحقيقية من قاعدة البيانات
  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data.services)
        setFilteredServices(data.services)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur lors du chargement des services:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (services.length === 0) return
    setFilteredServices(services.filter(s => {
      const serviceList = JSON.parse(s.services_list || '[]')
      return s.name.toLowerCase().includes(search.toLowerCase()) || 
             s.location.toLowerCase().includes(search.toLowerCase()) ||
             serviceList.some(service => service.toLowerCase().includes(search.toLowerCase()))
    }))
  }, [search, services])

  // ✅ وظيفة التصويت للخدمة
  const handleVoteService = async (serviceId, type) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const result = await response.json();
        // ✅ تحديث القائمة مباشرة بعد التصويت بنجاح بالقيم الجديدة من الخادم
        setServices(prevServices => prevServices.map(s => {
          if (s.id === serviceId) {
            return {
              ...s,
              rating: result.rating,
              votes_up: result.votes_up,
              votes_down: result.votes_down,
              reviews_count: result.reviews_count
            }
          }
          return s;
        }));
        
        // ✅ تخزين حالة التصويت في localStorage لمنع التصويت المتكرر
        const votedServices = JSON.parse(localStorage.getItem('voted_services') || '{}');
        votedServices[serviceId] = type;
        localStorage.setItem('voted_services', JSON.stringify(votedServices));
        
        alert('✅ شكرا لك على تصويتك!');
      }
    } catch (err) {
      alert('❌ حدث خطأ أثناء التصويت');
    }
  }

  // ✅ وظيفة زر الاتصال بالفني
  const handleContactService = (service) => {
    if (!service.phone) {
      alert('❌ Numéro de téléphone non disponible pour ce service.');
      return;
    }

    // ✅ الكشف عن اذا كان المستخدم على الهاتف ام حاسوب
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // ✅ على الهاتف: فتح تطبيق الاتصال مباشرة
      window.location.href = `tel:${service.phone}`;
    } else {
      // ✅ على الحاسوب: عرض رقم الهاتف مع امكانية النسخ
      if (confirm(`📞 Numéro de téléphone:\n${service.phone}\n\n✅ Appuyez sur OK pour copier le numéro`)) {
        navigator.clipboard.writeText(service.phone).then(() => {
          alert('✅ Numéro copié avec succès ! Vous pouvez appeler maintenant.');
        }).catch(() => {
          alert(`📞 Numéro de téléphone: ${service.phone}`);
        });
      }
    }
  }

  return (
    <div className="page-shell">
      <AppHeader subTitle="SERVICES" />

      <section className="about-section">
        <div className="about-card">
          <h2>Services à domicile</h2>
          <p style={{ color: '#f8fafc', marginBottom: '20px' }}>Trouvez des techniciens qualifiés qui se déplacent jusqu'à vous !</p>
          <input
            type="text"
            placeholder="Rechercher par nom, ville ou service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc', background: '#f8fafc', color: '#000' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredServices.map(service => {
              const serviceList = JSON.parse(service.services_list || '[]')
              return (
                <div key={service.id} style={{ background: '#000000', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ color: '#ffffff', marginTop: 0 }}>{service.name}</h3>
                  <p style={{ color: '#f8fafc' }}>📍 {service.location}</p>
                  <p style={{ color: '#f8fafc' }}>⭐ {service.rating}/5</p>
                  <p style={{ color: '#f8fafc' }}>👍 {service.votes_up || 0} | 👎 {service.votes_down || 0} | 💬 {service.reviews_count || 0} avis</p>
                  {service.working_hours && (
                    <p style={{ color: '#f8fafc' }}>⏰ Horaires: {service.working_hours}</p>
                  )}
                  {service.working_days && (
                    <p style={{ color: '#f8fafc' }}>📅 Jours: {service.working_days}</p>
                  )}
                  <p style={{ color: '#f8fafc', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '12px' }}>{service.description}</p>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>Services proposés:</strong>
                    <ul style={{ color: '#f8fafc', fontSize: '0.85rem', marginTop: '6px', paddingLeft: '20px' }}>
                      {serviceList.map((serv, index) => (
                        <li key={index}>{serv}</li>
                      ))}
                    </ul>
                  </div>

                  {localStorage.getItem('user_token') && (
                    <div style={{display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '12px'}}>
                      <button 
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: '0.9rem'
                        }}
                        onClick={() => handleVoteService(service.id, 'up')}
                      >👍 J'aime</button>
                      <button 
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          fontSize: '0.9rem'
                        }}
                        onClick={() => handleVoteService(service.id, 'down')}
                      >👎 Je n'aime pas</button>
                    </div>
                  )}

                  <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                    <button className="btn btn-primary" style={{flex: 1}} onClick={() => handleContactService(service)}>📞 Contacter</button>
                    {service.latitude && service.longitude && (
                      <button className="btn btn-secondary" style={{flex: 1}} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`, '_blank')}>📍 Google Maps</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function GarageFinder() {
  const [search, setSearch] = useState('')
  const [garages, setGarages] = useState([])
  const [filteredGarages, setFilteredGarages] = useState([])
  const [loading, setLoading] = useState(true)

  // ✅ جلب الجراجات الحقيقية من قاعدة البيانات
  useEffect(() => {
    fetch('/api/garages')
      .then(res => res.json())
      .then(data => {
        setGarages(data.garages)
        setFilteredGarages(data.garages)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur lors du chargement des garages:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (garages.length === 0) return
    setFilteredGarages(garages.filter(g => 
      g.name.toLowerCase().includes(search.toLowerCase()) || 
      g.location.toLowerCase().includes(search.toLowerCase())
    ))
  }, [search, garages])

  // ✅ وظيفة التصويت للجراج
  const handleVoteGarage = async (garageId, type) => {
    try {
      const response = await fetch(`/api/garages/${garageId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const result = await response.json();
        // ✅ تحديث القائمة مباشرة بعد التصويت بنجاح بالقيم الجديدة من الخادم
        setGarages(prevGarages => prevGarages.map(g => {
          if (g.id === garageId) {
            return {
              ...g,
              rating: result.rating,
              votes_up: result.votes_up,
              votes_down: result.votes_down,
              reviews_count: result.reviews_count
            }
          }
          return g;
        }));
        
        // ✅ تخزين حالة التصويت في localStorage لمنع التصويت المتكرر
        const votedGarages = JSON.parse(localStorage.getItem('voted_garages') || '{}');
        votedGarages[garageId] = type;
        localStorage.setItem('voted_garages', JSON.stringify(votedGarages));
        
        alert('✅ شكرا لك على تصويتك!');
      }
    } catch (err) {
      alert('❌ حدث خطأ أثناء التصويت');
    }
  }

  // ✅ وظيفة زر حجز او الاتصال بالجراج
  const handleContactGarage = (garage) => {
    if (!garage.phone) {
      alert('❌ Numéro de téléphone non disponible pour ce garage.');
      return;
    }

    // ✅ الكشف عن نوع الجهاز
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // ✅ على الهاتف: فتح تطبيق الاتصال مباشرة
      window.location.href = `tel:${garage.phone}`;
    } else {
      // ✅ على الحاسوب: عرض رقم الهاتف مع امكانية النسخ
      if (confirm(`📞 Numéro du garage:\n${garage.phone}\n\n✅ Appuyez sur OK pour copier le numéro`)) {
        navigator.clipboard.writeText(garage.phone).then(() => {
          alert('✅ Numéro copié avec succès ! Vous pouvez appeler maintenant.');
        }).catch(() => {
          alert(`📞 Numéro du garage: ${garage.phone}`);
        });
      }
    }
  }

  return (
    <div className="page-shell">
      <AppHeader subTitle="GARAGE" />

      <section className="about-section">
        <div className="about-card">
          <h2>Trouver un garage</h2>
          <input
            type="text"
            placeholder="Rechercher par nom ou ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc', background: '#f8fafc', color: '#000' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredGarages.map(garage => (
              <div key={garage.id} style={{ background: '#000000', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                 <h3 style={{ color: '#ffffff', marginTop: 0 }}>{garage.name}</h3>
                 <p style={{ color: '#f8fafc' }}>📍 {garage.location}</p>
                 <p style={{ color: '#f8fafc' }}>⭐ {garage.rating}/5</p>
                 <p style={{ color: '#f8fafc' }}>👍 {garage.votes_up} | 👎 {garage.votes_down} | 💬 {garage.reviews_count || 0} avis</p>
                 <p style={{ color: '#f8fafc' }}>Services: {JSON.parse(garage.services || '[]').join(', ')}</p>
                 {garage.working_hours && (
                   <p style={{ color: '#f8fafc' }}>⏰ Horaires: {garage.working_hours}</p>
                 )}
                 {garage.working_days && (
                   <p style={{ color: '#f8fafc' }}>📅 Jours: {garage.working_days}</p>
                 )}
                 
                 {localStorage.getItem('user_token') && (
                  <div style={{display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '12px'}}>
                    <button 
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '0.9rem'
                      }}
                      onClick={() => handleVoteGarage(garage.id, 'up')}
                     >👍 J'aime</button>
                     <button 
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: '0.9rem'
                      }}
                      onClick={() => handleVoteGarage(garage.id, 'down')}
                     >👎 Je n'aime pas</button>
                  </div>
                )}

                <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                  <button className="btn btn-primary" style={{flex: 1}} onClick={() => handleContactGarage(garage)}>📞 Appeler</button>
                  {garage.latitude && garage.longitude && (
                     <button className="btn btn-secondary" style={{flex: 1}} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${garage.latitude},${garage.longitude}`, '_blank')}>📍 Google Maps</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function ConnexionPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone || !password) {
      setMessage('Veuillez remplir tous les champs')
      return
    }

    setMessage('Connexion en cours...')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })

      const data = await response.json()

      if (response.ok) {
        // ✅ تسجيل الدخول ناجح
        localStorage.setItem('user_token', data.token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
        setMessage('✅ Connexion réussie ! Bienvenue.')
        
        setTimeout(() => {
          navigate('/')
          window.location.reload()
        }, 1500)
      } else {
        // ❌ معلومات خاطئة
        setMessage('❌ Non inscrit ! Vous pouvez créer un compte ci-dessous.')
      }
    } catch (err) {
      setMessage('❌ Erreur de connexion au serveur.')
    }
  }

  return (
    <div className="page-shell">
      <header className="header-bar">
        <div className="brand-card">
          <span className="brand-logo">MechanicSmart</span>
        </div>
        <nav className="nav-links">
          <Link to="/">Accueil</Link>
          <Link to="/about">À propos</Link>
        </nav>
      </header>

      <section className="connexion-section">
        <div className="connexion-card">
          <h2>Connexion</h2>
          <form onSubmit={handleSubmit} className="connexion-form">
            <div className="form-group">
              <label htmlFor="phone">Numéro de téléphone</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Entrez votre numéro de téléphone"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                className="form-input"
              />
            </div>
            {message && <div className="message">{message}</div>}
            <button type="submit" className="btn btn-primary">Se connecter</button>
            
            {message.includes('Non inscrit') && (
              <div style={{marginTop: '20px', textAlign: 'center'}}>
                <Link to="/inscription" className="btn btn-primary">
                  🆕 S'inscrire
                </Link>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  )
}

function InscriptionPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [carType, setCarType] = useState('')
  const [otherCar, setOtherCar] = useState('')
  const [message, setMessage] = useState('')
  const [customCars, setCustomCars] = useState([])

  // قائمة السيارات الشهيرة في الجزائر
  const popularCars = [
    'Dacia Logan', 'Dacia Sandero', 'Dacia Duster',
    'Renault Clio', 'Renault Megane', 'Renault Kwid',
    'Peugeot 208', 'Peugeot 301', 'Peugeot 2008',
    'Citroën C3', 'Citroën C4',
    'Toyota Corolla', 'Toyota Hilux',
    'Hyundai Tucson', 'Hyundai Accent',
    'Kia Picanto', 'Kia Sportage',
    'Fiat Panda', 'Fiat 500'
  ]

  // دمج السيارات الشهيرة مع السيارات المخصصة
  const allCars = [...popularCars, ...customCars]

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validation simple
    if (!phone || !password || (!carType && !otherCar)) {
      setMessage('Veuillez remplir tous les champs')
      return
    }

    setMessage('Création du compte en cours...')

    try {
      // ✅ ارسال الطلب الحقيقي الى الاي بي اي في السيرفر
      const selectedVehicle = carType === 'Autre' ? otherCar : carType;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          password: password,
          carType: selectedVehicle
        })
      })

      const data = await response.json()

      if (response.ok) {
        // إذا اختار "Autre" وكتب سيارة جديدة
        if (carType === 'Autre' && otherCar.trim()) {
          setCustomCars(prev => [...prev, otherCar.trim()])
          setMessage(`✅ Inscription réussie ! Votre véhicule "${otherCar.trim()}" a été ajouté à la liste.`)
        } else {
          setMessage('✅ Inscription réussie ! Bienvenue.')
        }
        
        // ✅ تم حفظ المستخدم في قاعدة البيانات بنجاح
        console.log('✅ Utilisateur créé avec succès dans la base de données:', data.user)
        
        // إعادة تعيين الحقول
        setPhone('')
        setPassword('')
        setCarType('')
        setOtherCar('')
      } else {
        setMessage(`❌ Erreur: ${data.error}`)
      }
    } catch (err) {
      setMessage('❌ Erreur de connexion au serveur.')
    }
  }

  const handleCarTypeChange = (e) => {
    const value = e.target.value
    setCarType(value)
    // إذا تم اختيار "Autre"، لا نمسح حقل "otherCar"
    if (value !== 'Autre') {
      setOtherCar('')
    }
  }

  return (
    <div className="page-shell">
      <header className="header-bar">
        <div className="brand-card">
          <span className="brand-logo">MechanicSmart</span>
        </div>
        <nav className="nav-links">
          <Link to="/">Accueil</Link>
          <Link to="/connexion">Connexion</Link>
          <Link to="/about">À propos</Link>
        </nav>
      </header>

      <section className="inscription-section">
        <div className="inscription-card">
          <h2>S'inscrire</h2>
          <form onSubmit={handleSubmit} className="inscription-form">
            <div className="form-group">
              <label htmlFor="phone">Numéro de téléphone</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Entrez votre numéro de téléphone"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="carType">Type de véhicule</label>
              <select
                id="carType"
                value={carType}
                onChange={handleCarTypeChange}
                className="form-input"
              >
                <option value="">Sélectionnez votre véhicule</option>
                {allCars.map(car => (
                  <option key={car} value={car}>{car}</option>
                ))}
                <option value="Autre">Autre</option>
              </select>
            </div>
            
            {carType === 'Autre' && (
              <div className="form-group">
                <label htmlFor="otherCar">Nom de votre véhicule</label>
                <input
                  type="text"
                  id="otherCar"
                  value={otherCar}
                  onChange={(e) => setOtherCar(e.target.value)}
                  placeholder="Entrez le nom de votre véhicule"
                  className="form-input"
                />
              </div>
            )}
            {message && <div className="message">{message}</div>}
            <button type="submit" className="btn btn-primary">S'inscrire</button>
          </form>
        </div>
      </section>
    </div>
  )
}

function AboutPage({ stats, garages, services }) {
  return (
    <div className="page-shell">
      <AppHeader />

      <main className="about-main">
        <section className="about-section">
          <div className="about-card">
            <h2>À propos de MechanicSmart</h2>
            <p>MechanicSmart est une plateforme innovante qui connecte les propriétaires de véhicules aux meilleurs garages et services d'entretien automobile.</p>
            <p>Nous facilitons la réservation des services de maintenance, le suivi des réparations et l'accès à des prestations de qualité.</p>
            <p>Notre mission est d'améliorer l'expérience d'entretien automobile en Algérie grâce à la technologie et à un réseau de garages partenaires fiables.</p>
          </div>
        </section>

        <section className="diagnostic-section">
          <div className="section-heading">
            <h2>Chiffres clés de MechanicSmart</h2>
            <p>Découvrez les statistiques en temps réel de notre plateforme automobile.</p>
          </div>
          <div className="cards-grid">
            <div className="stats-card">
              <h3>{stats.totalUsers || 0}</h3>
              <p>Utilisateurs</p>
            </div>
            <div className="stats-card">
              <h3>{garages.length}</h3>
              <p>Garages enregistrés</p>
            </div>
            <div className="stats-card">
              <h3>{services.length}</h3>
              <p>Services à domicile</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [message, setMessage] = useState('')

  // ✅ متغيرات الحالة لاقسام الجراجات والخدمات الجديدة
  const [garages, setGarages] = useState([])
  const [services, setServices] = useState([])
  const [showGarageForm, setShowGarageForm] = useState(false)
  const [editingGarage, setEditingGarage] = useState(null)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [newGarage, setNewGarage] = useState({name: '', location: '', rating: '5.0', reviews_count: '0', phone: '', address: '', working_hours: '', working_days: '', image_url: '', latitude: '', longitude: '', services: ''})
  const [newService, setNewService] = useState({name: '', location: '', rating: '5.0', reviews_count: '0', phone: '', description: '', working_hours: '', working_days: '', image_url: '', latitude: '', longitude: '', services_list: ''})

  const loadAdminData = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
      }

      // ✅ جلب قائمة الجراجات
      const garagesRes = await fetch('/api/garages', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (garagesRes.ok) {
        const garagesData = await garagesRes.json()
        setGarages(garagesData.garages)
      }

      // ✅ جلب قائمة الخدمات
      const servicesRes = await fetch('/api/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData.services)
      }
    } catch (err) {
      localStorage.removeItem('admin_token')
      setLoggedIn(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setLoggedIn(true)
      loadAdminData()
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
      setMessage('Connexion en cours...')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })

      const data = await res.json()

      if (res.ok && data.user.role === 'admin') {
        localStorage.setItem('admin_token', data.token)
        localStorage.setItem('user_token', data.token)
        setLoggedIn(true)
        setMessage('✅ Connexion réussie !')
        // ✅ 🔥 بعد تسجيل الدخول بنجاح نقوم بجلب كل البيانات فورا!
        await loadAdminData()
      } else {
        setMessage('❌ Accès non autorisé.')
      }
    } catch (err) {
      setMessage('❌ Erreur de connexion au serveur.')
    }
  }

  // ✅ ✅ تحميل البيانات مباشرة بعد فتح الصفحة حتى لو كان مسجل الدخول مسبقا
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setLoggedIn(true)
      loadAdminData()
    }
  }, [loggedIn])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setLoggedIn(false)
    setPhone('')
    setPassword('')
  }

  // ✅ دالة تحديث جراج
  const handleUpdateGarage = async () => {
    const token = localStorage.getItem('admin_token')
    if (!editingGarage.name || !editingGarage.location) {
      setMessage('❌ Nom et localisation sont obligatoires.')
      return
    }

    const servicesArray = editingGarage.services.split(',').map(s => s.trim()).filter(s => s)

    try {
      const res = await fetch(`/api/admin/garages/${editingGarage.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingGarage.name,
          location: editingGarage.location,
          rating: editingGarage.rating,
          reviews_count: editingGarage.reviews_count,
          services: servicesArray,
          phone: editingGarage.phone,
          address: editingGarage.address,
          working_hours: editingGarage.working_hours,
          working_days: editingGarage.working_days,
          image_url: editingGarage.image_url,
          latitude: editingGarage.latitude,
          longitude: editingGarage.longitude,
          source: editingGarage.source,
          verified: editingGarage.verified
        })
      })

      if (res.ok) {
        setMessage('✅ Garage modifié avec succès !')
        setEditingGarage(null)
        loadAdminData()
      }
    } catch (err) {
      setMessage('❌ Erreur lors de la modification.')
    }
  }

  // ✅ دالة اضافة جراج جديد
  const handleAddGarage = async () => {
    const token = localStorage.getItem('admin_token')
    if (!newGarage.name || !newGarage.location) {
      setMessage('❌ Nom et localisation sont obligatoires.')
      return
    }

    const servicesArray = newGarage.services.split(',').map(s => s.trim()).filter(s => s)

    try {
      const res = await fetch('/api/admin/garages', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newGarage.name,
          location: newGarage.location,
          rating: newGarage.rating,
          reviews_count: newGarage.reviews_count,
          services: servicesArray,
          phone: newGarage.phone,
          address: newGarage.address,
          working_hours: newGarage.working_hours,
          working_days: newGarage.working_days,
          image_url: newGarage.image_url,
          latitude: newGarage.latitude,
          longitude: newGarage.longitude,
          source: newGarage.verified === false ? 'Google Maps' : 'local',
          verified: newGarage.verified !== false
        })
      })

      if (res.ok) {
        setMessage('✅ Garage ajouté avec succès !')
        setNewGarage({name: '', location: '', rating: '5.0', reviews_count: '0', phone: '', address: '', working_hours: '', working_days: '', image_url: '', latitude: '', longitude: '', services: ''})
        setShowGarageForm(false)
        loadAdminData()
      }
    } catch (err) {
      setMessage('❌ Erreur lors de l\'ajout.')
    }
  }

  // ✅ دالة حذف جراج
  const handleDeleteGarage = async (id) => {
    const token = localStorage.getItem('admin_token')
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce garage ?')) return

    try {
      await fetch(`/api/admin/garages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      loadAdminData()
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression.')
    }
  }

  // ✅ دالة تحديث خدمة
  const handleUpdateService = async () => {
    alert('🔧 Début de la mise à jour...')
    const token = localStorage.getItem('admin_token')
    if (!editingService.name || !editingService.location) {
      setMessage('❌ Nom et localisation sont obligatoires.')
      return
    }

    let servicesArray = []
    try {
      servicesArray = editingService.services_list.split(',').map(s => s.trim()).filter(s => s)
    } catch (e) {
      alert('❌ Erreur parsing: ' + e.message)
    }

    try {
      alert('🔧 Envoi de la requête...')
      const res = await fetch(`/api/admin/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingService.name,
          location: editingService.location,
          rating: parseFloat(editingService.rating) || 5.0,
          reviews_count: parseInt(editingService.reviews_count) || 0,
          description: editingService.description || '',
          services_list: servicesArray,
          phone: editingService.phone || '',
          working_hours: editingService.working_hours || '',
          working_days: editingService.working_days || '',
          image_url: editingService.image_url || '',
          source: editingService.source || 'local',
          verified: editingService.verified !== 0 && editingService.verified !== false
        })
      })

      alert('🔧 Réponse reçue! Status: ' + res.status)
      const data = await res.json()
      alert('🔧 Données: ' + JSON.stringify(data))

      if (res.ok) {
        alert('✅ Mise à jour réussie! Fermeture du formulaire...')
        setMessage('✅ Service modifié avec succès !')
        setEditingService(null)
        alert('✅ Formulaire fermé!')
      } else {
        alert('❌ Erreur serveur: ' + (data.error || 'Inconnue'))
        setMessage('❌ Erreur serveur: ' + (data.error || 'Inconnue'))
      }
    } catch (err) {
      alert('❌ Erreur: ' + err.message)
      setMessage('❌ Erreur lors de la modification: ' + err.message)
    }
  }

  // ✅ دالة اضافة خدمة جديدة
  const handleAddService = async () => {
    const token = localStorage.getItem('admin_token')
    if (!newService.name || !newService.location) {
      setMessage('❌ Nom et localisation sont obligatoires.')
      return
    }

    const servicesArray = newService.services_list.split(',').map(s => s.trim()).filter(s => s)

    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newService.name,
          location: newService.location,
          rating: newService.rating,
          reviews_count: newService.reviews_count,
          description: newService.description,
          services_list: servicesArray,
          phone: newService.phone,
          working_hours: newService.working_hours,
          working_days: newService.working_days,
          image_url: newService.image_url,
          latitude: newService.latitude,
          longitude: newService.longitude,
          source: newService.verified === false ? 'Google Maps' : 'local',
          verified: newService.verified !== false
        })
      })

      if (res.ok) {
        setMessage('✅ Service ajouté avec succès !')
        setNewService({name: '', location: '', rating: '5.0', reviews_count: '0', phone: '', description: '', working_hours: '', working_days: '', image_url: '', latitude: '', longitude: '', services_list: ''})
        setShowServiceForm(false)
        loadAdminData()
      }
    } catch (err) {
      setMessage('❌ Erreur lors de l\'ajout.')
    }
  }

  // ✅ دالة حذف خدمة
  const handleDeleteService = async (id) => {
    const token = localStorage.getItem('admin_token')
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return

    try {
      await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      loadAdminData()
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression.')
    }
  }

  // ✅ دالة حذف مستخدم
  const handleDeleteUser = async (id) => {
    const token = localStorage.getItem('admin_token')
    if (!window.confirm('⚠️ هل انت متاكد انك تريد حذف هذا المستخدم نهائيا؟')) return

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setMessage('✅ تم حذف المستخدم بنجاح')
        // ✅ تحديث قائمة المستخدمين تلقائيا
        loadAdminData()
      } else {
        const data = await res.json()
        setMessage(`❌ ${data.error}`)
      }
    } catch (err) {
      setMessage('❌ حدث خطأ اثناء الحذف')
    }
  }

  if (!loggedIn) {
    return (
      <div className="page-shell">
        <header className="header-bar">
          <div className="brand-card">
            <span className="brand-logo">MechanicSmart</span>
            <span className="brand-sub">ADMIN</span>
          </div>
          <nav className="nav-links">
            <Link to="/">Accueil</Link>
            <Link to="/garages">Garages</Link>
            <Link to="/connexion">Connexion</Link>
            <Link to="/inscription">S'inscrire</Link>
          </nav>
        </header>

        <section className="connexion-section">
          <div className="connexion-card">
            <h2>🔐 Administration</h2>
            <form onSubmit={handleLogin} className="connexion-form">
              <div className="form-group">
                <label>Nom d'utilisateur</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="admin"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123"
                  className="form-input"
                />
              </div>
              {message && <div className="message">{message}</div>}
              <button type="submit" className="btn btn-primary">Connexion</button>
            </form>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <style>{adminResponsiveStyles}</style>
      <header className="header-bar">
        <div className="brand-card">
          <span className="brand-logo">MechanicSmart</span>
          <span className="brand-sub">ADMIN</span>
        </div>
        <nav className="nav-links">
          <button onClick={handleLogout} style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer'}}>Déconnexion</button>
        </nav>
      </header>

      <main className="about-main">
        <section className="diagnostic-section">
          <div className="section-heading">
            <h2>📊 Tableau de bord</h2>
            <p>Statistiques générales de la plateforme</p>
          </div>
          <div className="cards-grid">
            <div className="stats-card">
              <h3>{stats.totalVehicles || 0}</h3>
              <p>Véhicules enregistrés</p>
            </div>
            <div className="stats-card">
              <h3>{stats.totalUsers || 0}</h3>
              <p>Utilisateurs</p>
            </div>
            <div className="stats-card">
              <h3>{stats.activeDiagnostics || 0}</h3>
              <p>Défauts actifs</p>
            </div>
            <div className="stats-card">
              <h3 style={{color: 'red'}}>{stats.criticalCount || 0}</h3>
              <p>Défauts critiques</p>
            </div>
            <div className="stats-card">
              <h3>{garages.length}</h3>
              <p>Garages enregistrés</p>
            </div>
            <div className="stats-card">
              <h3>{services.length}</h3>
              <p>Services à domicile</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-card">
            <h2>👥 Liste des utilisateurs inscrits</h2>
            
            <div style={{display: 'grid', gap: '15px', marginTop: '20px'}}>
              {users.map(user => (
                <div key={user.id} style={{
                  background: '#0f172a',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <strong style={{color: 'white', fontSize: '1.1rem'}}>📱 {user.phone}</strong>
                      <p style={{color: '#94a3b8', margin: '5px 0'}}>🚗 {user.vehicle_type}</p>
                      <p style={{color: '#64748b', fontSize: '0.8rem'}}>📅 {user.created_at}</p>
                    </div>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                      <span style={{
                        background: user.role === 'admin' ? '#dc2626' : '#2563eb',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>{user.role}</span>
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          style={{
                            background: '#dc2626', 
                            border: 'none', 
                            color: 'white', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer'
                          }}
                        >🗑️ Supprimer</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ✅ قسم ادارة الجراجات الجديد */}
        <section className="about-section">
          <div className="about-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2>🏪 Gestion des Garages</h2>
              <button className="btn btn-primary" onClick={() => setShowGarageForm(!showGarageForm)}>
                ➕ Ajouter un garage
              </button>
            </div>

            {editingGarage && (
              <div style={{background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px'}}>
                <h3 style={{color: 'white', marginBottom: '15px'}}>✏️ Modifier le Garage: {editingGarage.name}</h3>
                <div style={{display: 'grid', gap: '12px'}}>
                  <input placeholder="Nom du garage" value={editingGarage.name} onChange={e => setEditingGarage({...editingGarage, name: e.target.value})} className="form-input" />
                  <input placeholder="Ville / Localisation (ex: Alger, Oran, Constantine)" value={editingGarage.location} onChange={e => setEditingGarage({...editingGarage, location: e.target.value})} className="form-input" />
                  <input placeholder="Note (ex: 4.5)" value={editingGarage.rating} onChange={e => setEditingGarage({...editingGarage, rating: e.target.value})} className="form-input" />
                  <input placeholder="Nombre d'avis (ex: 15)" value={editingGarage.reviews_count} onChange={e => setEditingGarage({...editingGarage, reviews_count: e.target.value})} className="form-input" />
                  <input placeholder="Numéro de téléphone" value={editingGarage.phone || ''} onChange={e => setEditingGarage({...editingGarage, phone: e.target.value})} className="form-input" />
                  <input placeholder="Adresse complète (ex: 12 Rue Didouche Mourad, Alger)" value={editingGarage.address || ''} onChange={e => setEditingGarage({...editingGarage, address: e.target.value})} className="form-input" />
                  <input placeholder="Horaires de travail (ex: 08:00 - 18:00)" value={editingGarage.working_hours || ''} onChange={e => setEditingGarage({...editingGarage, working_hours: e.target.value})} className="form-input" />
                  <select value={editingGarage.working_days || ''} onChange={e => setEditingGarage({...editingGarage, working_days: e.target.value})} className="form-input" style={{color: editingGarage.working_days ? '#fff' : '#94a3b8'}}>
                    <option value="" style={{color: '#000'}}>Jours de travail</option>
                    <option value="Samedi-Jeudi" style={{color: '#000'}}>Samedi - Jeudi (7j/7)</option>
                    <option value="Dimanche-Jeudi" style={{color: '#000'}}>Dimanche - Jeudi</option>
                    <option value="Samedi-Vendredi" style={{color: '#000'}}>Samedi - Vendredi</option>
                    <option value="Lundi-Vendredi" style={{color: '#000'}}>Lundi - Vendredi</option>
                    <option value="Samedi" style={{color: '#000'}}>Samedi seulement</option>
                    <option value="Dimanche" style={{color: '#000'}}>Dimanche seulement</option>
                    <option value="Tous les jours" style={{color: '#000'}}>Tous les jours</option>
                    <option value="Sur rendez-vous" style={{color: '#000'}}>Sur rendez-vous</option>
                  </select>
                  <input placeholder="URL de l'image" value={editingGarage.image_url || ''} onChange={e => setEditingGarage({...editingGarage, image_url: e.target.value})} className="form-input" />
                  <input placeholder="Latitude" value={editingGarage.latitude || ''} onChange={e => setEditingGarage({...editingGarage, latitude: e.target.value})} className="form-input" />
                  <input placeholder="Longitude" value={editingGarage.longitude || ''} onChange={e => setEditingGarage({...editingGarage, longitude: e.target.value})} className="form-input" />
                  <input placeholder="Services (séparés par virgule)" value={editingGarage.services} onChange={e => setEditingGarage({...editingGarage, services: e.target.value})} className="form-input" />
                  
                  <div style={{color: 'white', marginBottom: '10px'}}>
                    <label style={{fontWeight: 'bold'}}>Statut du garage:</label>
                    <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="editGarageStatus" 
                          checked={editingGarage.verified !== 0} 
                          onChange={() => setEditingGarage({...editingGarage, verified: 1, source: 'local'})}
                        />
                        <span style={{background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>✔ vérifié | partner MechanicSmart</span>
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="editGarageStatus" 
                          checked={editingGarage.verified === 0} 
                          onChange={() => setEditingGarage({...editingGarage, verified: 0, source: 'Google Maps'})}
                        />
                        <span style={{background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>⏳ Non vérifié | Google Maps</span>
                      </label>
                    </div>
                  </div>

                  <div style={{display: 'flex', gap: '10px'}}>
                    <button className="btn btn-primary" style={{flex: 1}} onClick={handleUpdateGarage}>💾 Enregistrer</button>
                    <button className="btn btn-secondary" style={{flex: 1}} onClick={() => setEditingGarage(null)}>❌ Annuler</button>
                  </div>
                </div>
              </div>
            )}

        {showGarageForm && (
              <div style={{background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px'}}>
                <h3 style={{color: 'white', marginBottom: '15px'}}>Nouveau Garage</h3>
                <div style={{display: 'grid', gap: '12px'}}>
                  <input placeholder="Nom du garage" value={newGarage.name} onChange={e => setNewGarage({...newGarage, name: e.target.value})} className="form-input" />
                  <input placeholder="Ville / Localisation (ex: Alger, Oran, Constantine)" value={newGarage.location} onChange={e => setNewGarage({...newGarage, location: e.target.value})} className="form-input" />
                  <input placeholder="Note (ex: 4.5)" value={newGarage.rating} onChange={e => setNewGarage({...newGarage, rating: e.target.value})} className="form-input" />
                  <input placeholder="Nombre d'avis (ex: 15)" value={newGarage.reviews_count} onChange={e => setNewGarage({...newGarage, reviews_count: e.target.value})} className="form-input" />
                  <input placeholder="Numéro de téléphone" value={newGarage.phone} onChange={e => setNewGarage({...newGarage, phone: e.target.value})} className="form-input" />
                  <input placeholder="Adresse complète (ex: 12 Rue Didouche Mourad, Alger)" value={newGarage.address} onChange={e => setNewGarage({...newGarage, address: e.target.value})} className="form-input" />
                  <input placeholder="Horaires de travail (ex: 08:00 - 18:00)" value={newGarage.working_hours} onChange={e => setNewGarage({...newGarage, working_hours: e.target.value})} className="form-input" />
                  <select value={newGarage.working_days} onChange={e => setNewGarage({...newGarage, working_days: e.target.value})} className="form-input" style={{color: newGarage.working_days ? '#fff' : '#94a3b8'}}>
                    <option value="" style={{color: '#000'}}>Jours de travail</option>
                    <option value="Samedi-Jeudi" style={{color: '#000'}}>Samedi - Jeudi (7j/7)</option>
                    <option value="Dimanche-Jeudi" style={{color: '#000'}}>Dimanche - Jeudi</option>
                    <option value="Samedi-Vendredi" style={{color: '#000'}}>Samedi - Vendredi</option>
                    <option value="Lundi-Vendredi" style={{color: '#000'}}>Lundi - Vendredi</option>
                    <option value="Samedi" style={{color: '#000'}}>Samedi seulement</option>
                    <option value="Dimanche" style={{color: '#000'}}>Dimanche seulement</option>
                    <option value="Tous les jours" style={{color: '#000'}}>Tous les jours</option>
                    <option value="Sur rendez-vous" style={{color: '#000'}}>Sur rendez-vous</option>
                  </select>
                  <input placeholder="URL de l'image" value={newGarage.image_url} onChange={e => setNewGarage({...newGarage, image_url: e.target.value})} className="form-input" />
                  <input placeholder="Latitude" value={newGarage.latitude} onChange={e => setNewGarage({...newGarage, latitude: e.target.value})} className="form-input" />
                  <input placeholder="Longitude" value={newGarage.longitude} onChange={e => setNewGarage({...newGarage, longitude: e.target.value})} className="form-input" />
                  <input placeholder="Services (séparés par virgule)" value={newGarage.services} onChange={e => setNewGarage({...newGarage, services: e.target.value})} className="form-input" />
                  
                  <div style={{color: 'white', marginBottom: '10px'}}>
                    <label style={{fontWeight: 'bold'}}>Statut du garage:</label>
                    <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="garageStatus" 
                          checked={newGarage.verified !== false} 
                          onChange={() => setNewGarage({...newGarage, verified: true, source: 'local'})}
                        />
                        <span style={{background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>✔ vérifié | partner MechanicSmart</span>
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="garageStatus" 
                          checked={newGarage.verified === false} 
                          onChange={() => setNewGarage({...newGarage, verified: false, source: 'Google Maps'})}
                        />
                        <span style={{background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>⏳ Non vérifié | Google Maps</span>
                      </label>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleAddGarage}>✅ Enregistrer</button>
                </div>
              </div>
            )}

             <div style={{display: 'grid', gap: '12px', marginTop: '15px'}}>
               {garages.map(garage => (
                 <div key={garage.id} className="admin-item-card" style={{
                   background: garage.verified === 0 ? '#1a0f00' : '#0f1a0f',
                   padding: '15px',
                   borderRadius: '10px',
                   border: garage.verified === 0 ? '2px solid #f59e0b' : '2px solid #22c55e',
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   flexWrap: 'wrap',
                   gap: '10px'
                 }}>
                   <div style={{flex: '1 1 200px', minWidth: '200px'}}>
                     <strong style={{color: 'white'}}>{garage.name}</strong>
                     <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: '3px 0'}}>📍 {garage.location} ⭐ {garage.rating}/5</p>
                     {garage.verified === 0 ? (
                       <span style={{
                         background: '#f59e0b',
                         color: '#000000',
                         padding: '2px 8px',
                         borderRadius: '4px',
                         fontSize: '0.75rem',
                         fontWeight: 'bold'
                       }}>⏳ Non vérifié | {garage.source}</span>
                     ) : (
                       <span style={{
                         background: '#22c55e',
                         color: '#000000',
                         padding: '2px 8px',
                         borderRadius: '4px',
                         fontSize: '0.75rem',
                         fontWeight: 'bold'
                       }}>✔ vérifié | partner MechanicSmart</span>
                     )}
                   </div>
                   <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                     <button 
                       onClick={() => {
                         setEditingGarage({
                           ...garage,
                           services: JSON.parse(garage.services || '[]').join(', ')
                         })
                       }} 
                       style={{background: '#2563eb', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap'}}
                     >✏️ Modifier</button>
                     {garage.verified === 0 && (
                       <button 
                         onClick={async () => {
                           const token = localStorage.getItem('admin_token');
                           try {
                             const res = await fetch(`/api/garages/external/${garage.id}/verify`, {
                               method: 'POST',
                               headers: { 
                                 'Authorization': `Bearer ${token}`
                               }
                             });
                             if (res.ok) {
                               alert('✅ تم اعتماد الجراج بنجاح!');
                               loadAdminData();
                             } else {
                               const data = await res.text();
                               alert('❌ خطأ: ' + data);
                             }
                           } catch(err) {
                             alert('❌ خطأ في الاتصال بالخادم: ' + err.message);
                           }
                         }} 
                         style={{background: '#16a34a', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap'}}
                       >✅ Approuver</button>
                     )}
                     <button onClick={() => handleDeleteGarage(garage.id)} style={{background: '#dc2626', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap'}}>
                       🗑️ Supprimer
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </section>

        {/* ✅ قسم ادارة الخدمات الجديد */}
        <section className="about-section">
          <div className="about-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2>🔧 Gestion des Services</h2>
              <button className="btn btn-primary" onClick={() => setShowServiceForm(!showServiceForm)}>
                ➕ Ajouter un service
              </button>
            </div>

            {editingService && (
              <div style={{background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px'}}>
                <h3 style={{color: 'white', marginBottom: '15px'}}>✏️ Modifier le Service: {editingService.name}</h3>
                <div style={{display: 'grid', gap: '12px'}}>
                  <input placeholder="Nom du technicien" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} className="form-input" />
                  <input placeholder="Ville" value={editingService.location} onChange={e => setEditingService({...editingService, location: e.target.value})} className="form-input" />
                  <input placeholder="Note (ex: 4.8)" value={editingService.rating} onChange={e => setEditingService({...editingService, rating: e.target.value})} className="form-input" />
                  <input placeholder="Nombre d'avis (ex: 15)" value={editingService.reviews_count} onChange={e => setEditingService({...editingService, reviews_count: e.target.value})} className="form-input" />
                  <input placeholder="Numéro de téléphone" value={editingService.phone || ''} onChange={e => setEditingService({...editingService, phone: e.target.value})} className="form-input" />
                  <textarea placeholder="Description du service" value={editingService.description || ''} onChange={e => setEditingService({...editingService, description: e.target.value})} className="form-input" rows="2" />
                  <input placeholder="Horaires de travail (ex: 08:00 - 18:00)" value={editingService.working_hours || ''} onChange={e => setEditingService({...editingService, working_hours: e.target.value})} className="form-input" />
                  <select value={editingService.working_days || ''} onChange={e => setEditingService({...editingService, working_days: e.target.value})} className="form-input" style={{color: editingService.working_days ? '#fff' : '#94a3b8'}}>
                    <option value="" style={{color: '#000'}}>Jours de travail</option>
                    <option value="Samedi-Jeudi" style={{color: '#000'}}>Samedi - Jeudi (7j/7)</option>
                    <option value="Dimanche-Jeudi" style={{color: '#000'}}>Dimanche - Jeudi</option>
                    <option value="Samedi-Vendredi" style={{color: '#000'}}>Samedi - Vendredi</option>
                    <option value="Lundi-Vendredi" style={{color: '#000'}}>Lundi - Vendredi</option>
                    <option value="Samedi" style={{color: '#000'}}>Samedi seulement</option>
                    <option value="Dimanche" style={{color: '#000'}}>Dimanche seulement</option>
                    <option value="Tous les jours" style={{color: '#000'}}>Tous les jours</option>
                    <option value="Sur rendez-vous" style={{color: '#000'}}>Sur rendez-vous</option>
                  </select>
                  <input placeholder="URL de l'image" value={editingService.image_url || ''} onChange={e => setEditingService({...editingService, image_url: e.target.value})} className="form-input" />
                  <input placeholder="Services proposés (séparés par virgule)" value={editingService.services_list} onChange={e => setEditingService({...editingService, services_list: e.target.value})} className="form-input" />
                  
                  <div style={{color: 'white', marginBottom: '10px'}}>
                    <label style={{fontWeight: 'bold'}}>Statut du service:</label>
                    <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="editServiceStatus" 
                          checked={editingService.verified !== 0} 
                          onChange={() => setEditingService({...editingService, verified: 1, source: 'local'})}
                        />
                        <span style={{background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>✔ vérifié | partner MechanicSmart</span>
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="editServiceStatus" 
                          checked={editingService.verified === 0} 
                          onChange={() => setEditingService({...editingService, verified: 0, source: 'Google Maps'})}
                        />
                        <span style={{background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>⏳ Non vérifié | Google Maps</span>
                      </label>
                    </div>
                  </div>

                  <div style={{display: 'flex', gap: '10px'}}>
                    <button type="button" className="btn btn-primary" style={{flex: 1}} onClick={() => { console.log('🟢 Button clicked!'); handleUpdateService(); }}>💾 Enregistrer</button>
                    <button type="button" className="btn btn-secondary" style={{flex: 1}} onClick={() => setEditingService(null)}>❌ Annuler</button>
                  </div>
                </div>
              </div>
            )}

            {showServiceForm && (
              <div style={{background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px'}}>
                <h3 style={{color: 'white', marginBottom: '15px'}}>Nouveau Service à domicile</h3>
                <div style={{display: 'grid', gap: '12px'}}>
                  <input placeholder="Nom du technicien" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="form-input" />
                  <input placeholder="Ville" value={newService.location} onChange={e => setNewService({...newService, location: e.target.value})} className="form-input" />
                  <input placeholder="Note (ex: 4.8)" value={newService.rating} onChange={e => setNewService({...newService, rating: e.target.value})} className="form-input" />
                  <input placeholder="Nombre d'avis (ex: 15)" value={newService.reviews_count} onChange={e => setNewService({...newService, reviews_count: e.target.value})} className="form-input" />
                  <input placeholder="Numéro de téléphone" value={newService.phone} onChange={e => setNewService({...newService, phone: e.target.value})} className="form-input" />
                  <textarea placeholder="Description du service" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="form-input" rows="2" />
                  <input placeholder="Horaires de travail (ex: 08:00 - 18:00)" value={newService.working_hours} onChange={e => setNewService({...newService, working_hours: e.target.value})} className="form-input" />
                  <select value={newService.working_days} onChange={e => setNewService({...newService, working_days: e.target.value})} className="form-input" style={{color: newService.working_days ? '#fff' : '#94a3b8'}}>
                    <option value="" style={{color: '#000'}}>Jours de travail</option>
                    <option value="Samedi-Jeudi" style={{color: '#000'}}>Samedi - Jeudi (7j/7)</option>
                    <option value="Dimanche-Jeudi" style={{color: '#000'}}>Dimanche - Jeudi</option>
                    <option value="Samedi-Vendredi" style={{color: '#000'}}>Samedi - Vendredi</option>
                    <option value="Lundi-Vendredi" style={{color: '#000'}}>Lundi - Vendredi</option>
                    <option value="Samedi" style={{color: '#000'}}>Samedi seulement</option>
                    <option value="Dimanche" style={{color: '#000'}}>Dimanche seulement</option>
                    <option value="Tous les jours" style={{color: '#000'}}>Tous les jours</option>
                    <option value="Sur rendez-vous" style={{color: '#000'}}>Sur rendez-vous</option>
                  </select>
                  <input placeholder="URL de l'image" value={newService.image_url} onChange={e => setNewService({...newService, image_url: e.target.value})} className="form-input" />
                  <input placeholder="Services proposés (séparés par virgule)" value={newService.services_list} onChange={e => setNewService({...newService, services_list: e.target.value})} className="form-input" />
                  
                  <div style={{color: 'white', marginBottom: '10px'}}>
                    <label style={{fontWeight: 'bold'}}>Statut du service:</label>
                    <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="serviceStatus" 
                          checked={newService.verified !== false} 
                          onChange={() => setNewService({...newService, verified: true, source: 'local'})}
                        />
                        <span style={{background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>✔ vérifié | partner MechanicSmart</span>
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                        <input 
                          type="radio" 
                          name="serviceStatus" 
                          checked={newService.verified === false} 
                          onChange={() => setNewService({...newService, verified: false, source: 'Google Maps'})}
                        />
                        <span style={{background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>⏳ Non vérifié | Google Maps</span>
                      </label>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleAddService}>✅ Enregistrer</button>
                </div>
              </div>
            )}

            <div style={{display: 'grid', gap: '12px', marginTop: '15px'}}>
              {services.map(service => (
                <div key={service.id} style={{
                  background: service.verified === 0 ? '#1a0f00' : '#0f172a',
                  padding: '15px',
                  borderRadius: '10px',
                  border: service.verified === 0 ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{flex: '1 1 200px', minWidth: '200px'}}>
                    <strong style={{color: 'white'}}>{service.name}</strong>
                    <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: '3px 0'}}>📍 {service.location} ⭐ {service.rating}/5</p>
                    {service.verified === 0 ? (
                      <span style={{
                        background: '#f59e0b',
                        color: '#000000',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>⏳ Non vérifié | {service.source}</span>
                    ) : (
                      <span style={{
                        background: '#22c55e',
                        color: '#000000',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>✔ vérifié | partner MechanicSmart</span>
                    )}
                  </div>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                    <button 
                      onClick={() => {
                        setEditingService({
                          ...service,
                          services_list: JSON.parse(service.services_list || '[]').join(', ')
                        })
                      }} 
                      style={{background: '#2563eb', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap'}}
                    >✏️ Modifier</button>
                    <button onClick={() => handleDeleteService(service.id)} style={{background: '#dc2626', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap'}}>
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// ✅ أنماط CSS متجاوبة للأدمن
const adminResponsiveStyles = `
  @media (max-width: 480px) {
    .admin-item-card {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .admin-item-card > div:first-child {
      min-width: auto !important;
      width: 100% !important;
    }
    .admin-item-card > div:last-child {
      justify-content: stretch !important;
      width: 100% !important;
    }
    .admin-item-card > div:last-child button {
      flex: 1 1 100% !important;
      width: 100% !important;
      padding: 12px !important;
      font-size: 0.9rem !important;
    }
  }
`

export default function App() {
  const [garages, setGarages] = useState([])
  const [services, setServices] = useState([])
  const [stats, setStats] = useState({})

  // ✅ جلب البيانات العامة فقط التي نحتاجها
  useEffect(() => {
    // ✅ اضافة وقت فريد لكل طلب لمنع التخزين المؤقت والذاكرة المؤقتة للمتصفح
    const cacheBuster = Date.now();

    // ✅ جلب الجراجات فقط
    fetch(`/api/garages?${cacheBuster}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setGarages(data.garages || [])
      })
      .catch(() => {})

    // ✅ جلب الخدمات فقط
    fetch(`/api/services?${cacheBuster}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services || [])
      })
      .catch(() => {})

    // ✅ جلب عدد المستخدمين فقط
    fetch(`/api/public/stats?${cacheBuster}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
      })
      .catch(() => {
        setStats({})
      })

    // ✅ تم حذف جلب المركبات والدياجنوسك تماماً لاننا لا نستخدمها اطلاقاً في الواجهة العامة

  }, [])

  return (
    <Routes>
      <Route path="/" element={<HomePage stats={stats} garages={garages} services={services} />} />
      <Route path="/services" element={<ServicesFinder />} />
      <Route path="/garages" element={<GarageFinder />} />
      <Route path="/connexion" element={<ConnexionPage />} />
      <Route path="/inscription" element={<InscriptionPage />} />
      <Route path="/about" element={<AboutPage stats={stats} garages={garages} services={services} />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}
