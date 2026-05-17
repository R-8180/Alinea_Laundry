import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome, FiGrid, FiBarChart2, FiRotateCcw,
  FiLogOut, FiMenu, FiX, FiUsers, FiChevronDown, FiStar, FiTruck
} from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';

const AdminLayout = ({ user, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isCourier = user?.role === 'courier';

  const handleLogout = () => {
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
        { key: 'laporan', path: '/dashboard?tab=laporan', icon: <FiBarChart2 />, label: 'Laporan' },
        { key: 'riwayat', path: '/dashboard?tab=riwayat', icon: <FiRotateCcw />, label: 'Riwayat' },
        { key: 'users', path: '/dashboard?tab=users', icon: <FiUsers />, label: 'Pengguna' },
      ]
    },
    {
      label: 'PENGATURAN',
      items: [
        { key: 'services', path: '/services', icon: <GiWashingMachine />, label: 'Layanan' },
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
    }
  ];

  const groups = isCourier ? courierGroups : adminGroups;

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
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✦</div>
          <div>
            <div className="sidebar-logo-name">Alinea Laundry</div>
              {isCourier ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Portal Kurir <FiTruck /></span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Kelola bisnis lebih mudah <FiStar /></span>}
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

        <button className="sidebar-logout" style={{ flexShrink: 0, margin: '12px 16px 24px' }} onClick={handleLogout}>
          <FiLogOut /> Keluar
        </button>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
          <div className="topbar-left">
            <span className="topbar-greeting">
              Selamat datang, <strong>{user?.name || roleLabel}</strong>
            </span>
          </div>
          <div className="topbar-right">
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
                    {roleLabel}
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
                      onClick={() => { handleLogout(); setUserMenuOpen(false); }}
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
    </div>
  );
};

export default AdminLayout;