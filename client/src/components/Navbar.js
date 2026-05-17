import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome, FiGrid, FiLogOut, FiLogIn, FiUserPlus,
  FiSearch, FiStar, FiMessageCircle, FiClipboard, FiMapPin,
  FiUser, FiChevronDown, FiX, FiMenu,
} from 'react-icons/fi';
import TopMarquee from './TopMarquee';

const menuItems = [
  { id: 'home', label: 'Home', icon: <FiHome /> },
  { id: 'track', label: 'Lacak', icon: <FiSearch /> },
  { id: 'services', label: 'Layanan', icon: <FiGrid /> },
  { id: 'parfum', label: 'Parfum', icon: <FiStar /> },
  { id: 'faq', label: 'FAQ', icon: <FiMessageCircle /> },
  { id: 'how-to-order', label: 'Cara Order', icon: <FiClipboard /> },
  { id: 'testimoni', label: 'Testimoni', icon: <FiMessageCircle /> },
  { id: 'contact', label: 'Kontak', icon: <FiMapPin /> },
];

const roleDashboardLabel = {
  customer: 'Dashboard',
  admin: 'Dashboard Admin',
  courier: 'Dashboard Kurir',
};

const roleColor = {
  customer: '#6366f1',
  admin: '#0ea5e9',
  courier: '#f59e0b',
};

const Navbar = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  useEffect(() => {
    document.body.classList.add('has-topnav');
    return () => document.body.classList.remove('has-topnav');
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else navigate(`/#${id}`);
    setOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setOpen(false);
    setUserMenuOpen(false);
  };

  const dashLabel = user ? (roleDashboardLabel[user.role] || 'Dashboard') : '';
  const badgeColor = user ? (roleColor[user.role] || '#6366f1') : '#6366f1';

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="logo" onClick={() => setOpen(false)}>
          Alinea Laundry
        </Link>
  
        {/* DESKTOP MENU */}
        <div className="desktop-nav">
          {user ? (
            <>
              <Link to="/">Home</Link>
              <Link to="/dashboard">{dashLabel}</Link>
              {user.role === 'customer' && (
                <Link to="/dashboard?tab=profile" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiUser /> Profil Saya
                </Link>
              )}
  
              {/* User Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 50, padding: '6px 14px 6px 6px', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', background: badgeColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    {user.name?.[0]?.toUpperCase() || <FiUser />}
                  </div>
                  <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</div>
                  </div>
                  <FiChevronDown style={{ fontSize: '0.8rem', color: 'white' }} />
                </button>
  
                {userMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setUserMenuOpen(false)} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      background: 'white', border: '1px solid var(--border)',
                      borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      minWidth: 190, zIndex: 1000, overflow: 'hidden',
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.88rem' }}>{user.name}</div>
                        <div style={{ fontSize: '0.72rem', color: badgeColor, fontWeight: 600, textTransform: 'capitalize', marginTop: 2 }}>{user.role}</div>
                      </div>
                      <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 16px', color: 'var(--navy)', textDecoration: 'none',
                        fontSize: '0.85rem', fontWeight: 600,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <FiGrid /> {dashLabel}
                      </Link>
                      {user.role === 'customer' && (
                        <Link to="/dashboard?tab=profile" onClick={() => setUserMenuOpen(false)} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 16px', color: 'var(--navy)', textDecoration: 'none',
                          fontSize: '0.85rem', fontWeight: 600,
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <FiUser /> Profil Saya
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%', padding: '10px 16px', border: 'none',
                          background: 'none', textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          color: '#ef4444', fontWeight: 600, fontSize: '0.85rem',
                          borderTop: '1px solid var(--border)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff1f1'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <FiLogOut /> Keluar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {menuItems.map((item, idx) => (
                <span key={idx} onClick={() => scrollTo(item.id)} style={{ cursor: 'pointer' }}>{item.label}</span>
              ))}
              <Link to="/login" style={{ marginLeft: 4 }}>
                <button className="btn btn-sm btn-secondary">Masuk</button>
              </Link>
              <Link to="/register">
                <button className="btn btn-sm">Daftar</button>
              </Link>
            </>
          )}
        </div>
  
        {/* HAMBURGER */}
        <button className="hamburger" onClick={() => setOpen(!open)}>
          {open ? <FiX /> : <FiMenu />}
        </button>
  
        {/* MOBILE MENU */}
        <div className={`mobile-nav ${open ? 'show' : ''}`}>
          {user ? (
            <>
              {/* User info mobile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>{user.name}</div>
                  <div style={{ fontSize: '0.72rem', color: badgeColor, fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</div>
                </div>
              </div>
              <Link to="/" onClick={() => setOpen(false)}><FiHome /> Home</Link>
              <Link to="/dashboard" onClick={() => setOpen(false)}><FiGrid /> {dashLabel}</Link>
              {user.role === 'customer' && (
                <Link to="/dashboard?tab=profile" onClick={() => setOpen(false)}><FiUser /> Profil Saya</Link>
              )}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#fff1f1', color: '#ef4444', border: 'none',
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.9rem', marginTop: 8, width: '100%',
                }}
              >
                <FiLogOut /> Keluar
              </button>
            </>
          ) : (
            <>
              {menuItems.map((item, idx) => (
                <span key={idx} onClick={() => scrollTo(item.id)}>{item.icon} {item.label}</span>
              ))}
              <div className="nav-auth-divider" />
              <div className="nav-auth-buttons">
                <Link to="/login" className="nav-auth-link outline" onClick={() => setOpen(false)}>
                  <FiLogIn /> Masuk
                </Link>
                <Link to="/register" className="nav-auth-link solid" onClick={() => setOpen(false)}>
                  <FiUserPlus /> Daftar
                </Link>
              </div>
            </>
          )}
        </div>
      </nav>
      {isPublicPage && <TopMarquee />}
    </>
  );
};

export default Navbar;
