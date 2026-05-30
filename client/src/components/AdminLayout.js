import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  FiHome, FiGrid, FiBarChart2, FiRotateCcw,
  FiLogOut, FiMenu, FiX, FiUsers, FiChevronDown, FiStar, FiTruck, FiBell, FiTrash2, FiHelpCircle, FiUser,
  FiMessageCircle, FiCheckCircle, FiCreditCard, FiClock, FiAlertCircle, FiPackage, FiInfo
} from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';

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


const AdminLayout = ({ user, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const seenNotifIds = useRef(new Set());
  const initialLoadDone = useRef(false);

  // Audio synthesizer chime helper
  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playTone(698.46, now, 0.15); // F5
      playTone(880.00, now + 0.12, 0.3); // A5
    } catch (err) {
      console.error('Failed to play synthesized notification chime:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        silent: true
      });

      const fetchedNotifs = res.data || [];
      
      // If this is not the first load, check for newly added unread notifications
      if (initialLoadDone.current) {
        let hasNewUnread = false;
        
        fetchedNotifs.forEach(n => {
          if (!n.is_read && !seenNotifIds.current.has(n.id)) {
            hasNewUnread = true;
            
            // Show premium SweetAlert2 Toast alert
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 4500,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
              }
            });

            Toast.fire({
              icon: 'info',
              title: `<span style="font-family: 'Outfit', sans-serif; font-weight: 700; color: var(--navy);">${n.title || 'Notifikasi Baru'}</span>`,
              html: `<span style="font-family: 'Inter', sans-serif; font-size: 0.85rem; color: var(--text-3);">${n.message}</span>`,
              background: '#ffffff',
              iconColor: 'var(--blue)',
              customClass: {
                popup: 'swal-premium-popup-toast'
              }
            });
          }
        });

        if (hasNewUnread) {
          playNotificationChime();
        }
      } else {
        initialLoadDone.current = true;
      }

      // Sync seen IDs
      fetchedNotifs.forEach(n => {
        seenNotifIds.current.add(n.id);
      });

      setNotifications(fetchedNotifs);
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
    if (user && (user.role === 'admin' || user.role === 'courier')) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000); // Check every 20s for admins/couriers
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      // Reset tracker on logout/role change
      seenNotifIds.current = new Set();
      initialLoadDone.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isCourier = user?.role === 'courier';

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
    navigate('/');
  };

  const getActiveKey = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || (location.pathname === '/' ? 'home' : 'dashboard');
  };
  const activeKey = getActiveKey();

  const isItemActive = (key) => {
    if (key === 'home') return location.pathname === '/';
    if (key === 'dashboard') return location.pathname === '/dashboard' && !activeKey;
    if (key === 'services') return location.pathname === '/services';
    if (key === 'offline-order') return location.pathname === '/offline-order';
    if (key === 'courier_history') return location.pathname === '/courier/history';
    return activeKey === key;
  };

  const adminGroups = [
    {
      label: 'WEBSITE',
      items: [
        { key: 'home', path: '/', icon: <FiHome />, label: 'Home' },
      ]
    },
    {
      label: 'MENU UTAMA',
      items: [
        { key: 'dashboard', path: '/dashboard', icon: <FiGrid />, label: 'Dashboard' },
        { key: 'offline-order', path: '/offline-order', icon: <FiUser />, label: 'Pesanan Offline' },
        { key: 'laporan', path: '/dashboard?tab=laporan', icon: <FiBarChart2 />, label: 'Laporan' },
        { key: 'riwayat', path: '/dashboard?tab=riwayat', icon: <FiRotateCcw />, label: 'Riwayat' },
        { key: 'users', path: '/dashboard?tab=users', icon: <FiUsers />, label: 'Pengguna' },
        { key: 'feedback', path: '/dashboard?tab=feedback', icon: <FiMessageCircle />, label: 'Feedback' },
      ]
    },
    {
      label: 'PENGATURAN',
      items: [
        { key: 'services', path: '/services', icon: <GiWashingMachine />, label: 'Layanan' },
        { key: 'bantuan', path: '/dashboard?tab=bantuan', icon: <FiHelpCircle />, label: 'Bantuan' },
      ]
    }
  ];

  const courierGroups = [
    {
      label: 'WEBSITE',
      items: [
        { key: 'home', path: '/', icon: <FiHome />, label: 'Halaman Depan' },
      ]
    },
    {
      label: 'MENU UTAMA',
      items: [
        { key: 'dashboard', path: '/dashboard', icon: <FiGrid />, label: 'Dashboard Kurir' },
        { key: 'courier_history', path: '/courier/history', icon: <FiRotateCcw />, label: 'Riwayat' },
      ]
    },
    {
      label: 'PENGATURAN',
      items: [
        { key: 'bantuan', path: '/dashboard?tab=bantuan', icon: <FiHelpCircle />, label: 'Bantuan' },
      ]
    }
  ];

  const groups = isCourier ? courierGroups : adminGroups;

  const branchLabels = { 1: 'Sampangan', 2: 'Unnes', 3: 'Tlogosari' };
  const branchText = user?.branch_id ? `Cabang ${branchLabels[user.branch_id]}` : 'Super Admin';
  const roleLabel = isCourier ? 'Kurir' : 'Admin';
  const roleBadgeColor = isCourier ? '#f59e0b' : '#6366f1';

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/images/logo-square.png" alt="Alinea Laundry Logo" style={{ height: '38px', width: '38px', objectFit: 'contain', display: 'block', borderRadius: '6px' }} />
          <div>
            <div className="sidebar-logo-name" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>Alinea Laundry</div>
            {isCourier ? (
              <span className="sidebar-logo-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Portal Kurir <FiTruck /></span>
            ) : (
              <span className="sidebar-logo-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{branchText} <FiStar /></span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map((group) => (
            <div key={group.label} className="sidebar-nav-group">
              <div className="sidebar-nav-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`sidebar-nav-item ${isItemActive(item.key) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <button className="sidebar-logout" style={{ flexShrink: 0, margin: '12px 16px 24px' }} onClick={handleLogoutClick}>
          <FiLogOut /> Keluar
        </button>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <FiX /> : <FiMenu />}
            </button>
            <span className="mobile-only" style={{
              marginLeft: 10,
              fontSize: '0.92rem',
              fontWeight: 700,
              color: 'var(--navy)',
              fontFamily: 'Outfit, sans-serif'
            }}>
              {isCourier ? 'Kurir' : (user?.branch_id ? `Admin ${branchLabels[user.branch_id]}` : 'Super Admin')}
            </span>
          </div>
          <div className="topbar-left">
            <span className="topbar-greeting">
              Selamat datang, <strong>{user?.name || roleLabel}</strong>
            </span>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {(user?.role === 'admin' || user?.role === 'courier') && (
              <div style={{ position: 'relative' }}>
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
                    color: 'var(--navy)',
                    fontSize: '1.3rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FiBell />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="notif-badge" style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: 'var(--red)',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: '50%',
                      padding: '2px 5px',
                      lineHeight: 1
                    }}>
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setNotifOpen(false)} />
                    <div className="notif-dropdown" style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      width: 320,
                      zIndex: 1000,
                      overflow: 'hidden'
                    }}>
                      <div className="notif-dropdown-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--navy)' }}>Notifikasi</h4>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--blue)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Hapus Semua
                          </button>
                        )}
                      </div>
                      <div className="notif-dropdown-body" style={{
                        maxHeight: 280,
                        overflowY: 'auto',
                        padding: '4px 0'
                      }}>
                        {notifications.length === 0 ? (
                          <div className="notif-empty" style={{
                            padding: '24px 16px',
                            textAlign: 'center',
                            color: 'var(--text-3)',
                            fontSize: '0.85rem'
                          }}>
                            Belum ada notifikasi baru
                          </div>
                        ) : (
                          notifications.map(n => {
                            const notifIcon = getNotifIcon(n.title);
                            return (
                              <div
                                key={n.id}
                                className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  padding: '12px 16px',
                                  borderBottom: '1px solid var(--border-light)',
                                  background: !n.is_read ? 'var(--sky-faint)' : 'transparent',
                                  transition: 'background 0.2s',
                                  position: 'relative',
                                  gap: '12px'
                                }}
                              >
                                <div 
                                  className="notif-item-icon" 
                                  style={{ 
                                    backgroundColor: `${notifIcon.color}15`, 
                                    color: notifIcon.color,
                                    marginTop: 0,
                                    width: '28px',
                                    height: '28px',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  {notifIcon.icon}
                                </div>
                                <div className="notif-item-content" style={{ flex: 1, paddingRight: 10, textAlign: 'left' }}>
                                  <span className="notif-item-title" style={{
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: 'var(--navy)',
                                    marginBottom: 2
                                  }}>
                                    {n.title}
                                  </span>
                                  <p className="notif-item-msg" style={{
                                    margin: 0,
                                    fontSize: '0.78rem',
                                    color: 'var(--text-2)',
                                    lineHeight: 1.4
                                  }}>
                                    {n.message}
                                  </p>
                                  <span className="notif-item-time" style={{
                                    display: 'block',
                                    fontSize: '0.68rem',
                                    color: 'var(--text-3)',
                                    marginTop: 4
                                  }}>
                                    {new Date(n.created_at).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => deleteNotification(n.id, e)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-3)',
                                    cursor: 'pointer',
                                    padding: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.color = 'var(--red)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.color = 'var(--text-3)';
                                  }}
                                  title="Hapus Notifikasi"
                                >
                                  <FiTrash2 size={13} />
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
            )}
            <div className="topbar-user-wrapper" style={{ position: 'relative' }}>
              <button
                className="topbar-user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--sky-faint)', border: '1.5px solid var(--border)',
                  borderRadius: 50, padding: '6px 14px 6px 6px', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div className="topbar-avatar">
                  {user?.name?.[0]?.toUpperCase() || roleLabel[0]}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div className="user-display-name" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)' }}>
                    {user?.name || roleLabel}
                  </div>
                  <div className="user-display-role" style={{ fontSize: '0.72rem', color: roleBadgeColor, fontWeight: 600 }}>
                    {roleLabel} {!isCourier && ` · ${branchLabels[user?.branch_id] || 'Global'}`}
                  </div>
                </div>
                <FiChevronDown style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginLeft: 2 }} />
              </button>

              {userMenuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setUserMenuOpen(false)} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    minWidth: 200, zIndex: 1000, overflow: 'hidden'
                  }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{user?.email || roleLabel}</div>
                    </div>
                    <button
                      onClick={() => { handleLogoutClick(); setUserMenuOpen(false); }}
                      style={{
                        width: '100%', padding: '12px 16px', border: 'none',
                        background: 'none', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: '#ef4444', fontWeight: 600, fontSize: '0.88rem',
                        transition: 'background 0.15s'
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
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>

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
    </div>
  );
};

export default AdminLayout;