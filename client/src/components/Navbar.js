import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FiHome, FiGrid, FiLogOut, FiLogIn, FiUserPlus,
  FiSearch, FiStar, FiMessageCircle, FiClipboard, FiMapPin,
  FiUser, FiChevronDown, FiX, FiMenu, FiBell, FiTrash2,
  FiCheckCircle, FiTruck, FiCreditCard, FiClock, FiAlertCircle,
  FiPackage, FiInfo,
} from 'react-icons/fi';
import TopMarquee from './TopMarquee';
import FeedbackModal from './FeedbackModal';

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

const getNotifIcon = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('selesai') || t.includes('diterima')) return { icon: <FiCheckCircle />, color: '#10b981' };
  if (t.includes('diantar') || t.includes('kurir') || t.includes('pickup') || t.includes('jemput')) return { icon: <FiTruck />, color: '#3b82f6' };
  if (t.includes('pembayaran') || t.includes('bayar') || t.includes('tagihan')) return { icon: <FiCreditCard />, color: '#6366f1' };
  if (t.includes('menunggu') || t.includes('antre') || t.includes('estimasi')) return { icon: <FiClock />, color: '#f59e0b' };
  if (t.includes('batal') || t.includes('overdue') || t.includes('gagal')) return { icon: <FiAlertCircle />, color: '#ef4444' };
  if (t.includes('diproses') || t.includes('proses')) return { icon: <FiPackage />, color: '#8b5cf6' };
  if (t.includes('pengumuman') || t.includes('broadcast')) return { icon: <FiInfo />, color: '#0ea5e9' };
  if (t.includes('saran') || t.includes('kritik') || t.includes('feedback')) return { icon: <FiMessageCircle />, color: '#f59e0b' };
  return { icon: <FiBell />, color: '#6366f1' };
};

const Navbar = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  const isActive = (path, tabName = null) => {
    if (tabName) {
      return location.pathname === path && location.search.includes(`tab=${tabName}`);
    }
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' && !location.search.includes('tab=profile');
    }
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
    } catch (err) {
      console.error('Clear notifications error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Mark read notifications error:', err);
    }
  };

  useEffect(() => {
    document.body.classList.add('has-topnav');
    return () => document.body.classList.remove('has-topnav');
  }, []);

  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const renderBellDropdown = (isMobile) => {
    if (!user || user.role !== 'customer') return null;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
      <div className={isMobile ? "mobile-notif-bell-wrapper" : "desktop-notif-bell-wrapper"} style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setNotifOpen(!notifOpen);
            setUserMenuOpen(false);
            if (!notifOpen) {
              markAllAsRead();
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: isMobile ? '1.45rem' : '1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? 38 : 'auto',
            height: isMobile ? 38 : 'auto',
            padding: isMobile ? 0 : 8,
            position: 'relative',
            borderRadius: '50%',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <FiBell />
          {unreadCount > 0 && (
            <span className="notif-badge">
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setNotifOpen(false)} />
            <div className="notif-dropdown" style={{ right: isMobile ? -42 : 0 }}>
              <div className="notif-dropdown-header">
                <h4>Notifikasi</h4>
                {notifications.length > 0 && (
                  <button onClick={clearAllNotifications} className="clear-all-btn">
                    Hapus Semua
                  </button>
                )}
              </div>
              <div className="notif-dropdown-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    Belum ada notifikasi baru
                  </div>
                ) : (
                  notifications.map(n => {
                    const notifIcon = getNotifIcon(n.title);
                    return (
                      <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                        <div 
                          className="notif-item-icon" 
                          style={{ 
                            backgroundColor: `${notifIcon.color}15`, 
                            color: notifIcon.color 
                          }}
                        >
                          {notifIcon.icon}
                        </div>
                        <div className="notif-item-content">
                          <span className="notif-item-title">{n.title}</span>
                          <p className="notif-item-msg">{n.message}</p>
                          <span className="notif-item-time">
                            {new Date(n.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <button onClick={(e) => deleteNotification(n.id, e)} className="notif-delete-btn" title="Hapus Notifikasi">
                          <FiTrash2 />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else navigate(`/#${id}`);
    setOpen(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
    navigate('/');
    setOpen(false);
    setUserMenuOpen(false);
    setShowLogoutConfirm(false);
  };

  const dashLabel = user ? (roleDashboardLabel[user.role] || 'Dashboard') : '';
  const badgeColor = user ? (roleColor[user.role] || '#6366f1') : '#6366f1';

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="logo-brand-link" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/images/logo-square.png" alt="Alinea Laundry Logo" style={{ height: '36px', width: '36px', objectFit: 'contain', display: 'block', borderRadius: '6px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'white', letterSpacing: '-0.3px' }}>Alinea Laundry</span>
        </Link>
  
        {/* DESKTOP MENU */}
        <div className="desktop-nav">
          {user ? (
            <>
              <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
              <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>{dashLabel}</Link>
              {user.role === 'customer' && (
                <span
                  onClick={() => setIsFeedbackOpen(true)}
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    padding: '0 8px',
                    transition: 'color 0.2s',
                    fontFamily: 'Outfit, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--sky)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
                >
                  <FiMessageCircle /> Feedback
                </span>
              )}

              {/* Notification Bell for Desktop */}
              {renderBellDropdown(false)}
  
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
                          <FiUser /> Profil &amp; Alamat
                        </Link>
                      )}
                      <button
                        onClick={handleLogoutClick}
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
  
        {/* RIGHT SIDE ACTIONS FOR MOBILE (Bell + Hamburger) */}
        <div className="mobile-nav-actions">
          {renderBellDropdown(true)}
          <button className="hamburger" onClick={() => setOpen(!open)}>
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
  
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
               <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setOpen(false)}><FiHome /> Home</Link>
              <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={() => setOpen(false)}><FiGrid /> {dashLabel}</Link>
              {user.role === 'customer' && (
                <span
                  onClick={() => { setIsFeedbackOpen(true); setOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'white',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FiMessageCircle /> Feedback
                </span>
              )}
              {user.role === 'customer' && (
                <Link to="/dashboard?tab=profile" className={isActive('/dashboard', 'profile') ? 'active' : ''} onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiUser /> Profil &amp; Alamat</Link>
              )}
              <button
                onClick={handleLogoutClick}
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

      {/* Premium Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: scale(0.95) translateY(10px); opacity: 0; }
              to { transform: scale(1) translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: '24px',
            padding: '32px 28px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.04)',
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50px',
              background: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              margin: '0 auto 20px',
              boxShadow: '0 8px 20px -6px rgba(239, 68, 68, 0.3)'
            }}>
              <FiLogOut />
            </div>
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f172a',
              fontFamily: 'Outfit, sans-serif'
            }}>
              Konfirmasi Keluar
            </h3>
            <p style={{
              margin: '0 0 24px',
              fontSize: '0.9rem',
              color: '#64748b',
              lineHeight: 1.5,
              fontFamily: 'Outfit, sans-serif'
            }}>
              Apakah Anda yakin ingin keluar dari akun Anda sekarang?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'Outfit, sans-serif'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 6px 16px -4px rgba(239, 68, 68, 0.4)',
                  fontFamily: 'Outfit, sans-serif'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(239, 68, 68, 0.4)';
                }}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
      {isPublicPage && <TopMarquee />}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} user={user} />
    </>
  );
};

export default Navbar;
