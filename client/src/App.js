import './App.css';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import QuickAccessBar from './components/QuickAccessBar';
import AdminLayout from './components/AdminLayout';

// Home & Auth di-load langsung (critical path, harus cepat)
import Home from './pages/Home';
import Login from './pages/Login';

import OfflineOrderForm from './pages/OfflineOrderForm';
import Register from './pages/Register';
import { subscribeUserToPush } from './utils/push';

// Halaman lain di-lazy load — hanya di-download saat user buka halaman itu
const CustomerDashboard  = lazy(() => import('./pages/CustomerDashboard'));
const OrderForm          = lazy(() => import('./pages/OrderForm'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const CourierDashboard   = lazy(() => import('./pages/CourierDashboard'));
const OrderHistory       = lazy(() => import('./pages/OrderHistory'));
const CourierHistory     = lazy(() => import('./pages/CourierHistory'));
const ServicesManagement = lazy(() => import('./pages/ServicesManagement'));

// Fallback saat chunk sedang di-download
const PageLoader = () => (
  <div className="app-loading">
    <div className="app-loading-spinner"></div>
    <p>Memuat...</p>
  </div>
);

// Page Transition Loading Bar
const PageTransitionProgress = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(70), 80);
    const t2 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 150);
    }, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    window.triggerLoadingBar = () => {
      setVisible(true);
      setProgress(30);
      setTimeout(() => setProgress(70), 80);
      setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 150);
      }, 300);
    };
    return () => {
      delete window.triggerLoadingBar;
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '3px',
      width: `${progress}%`,
      background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5), 0 0 5px rgba(16, 185, 129, 0.5)',
      zIndex: 9999,
      transition: 'width 0.2s ease-out, opacity 0.2s'
    }} />
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const apiBase = process.env.REACT_APP_API_URL || '';

    if (storedUser && token) {
      try {
        // Render instantly using cached data from localStorage
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
      setLoading(false);

      // Perform background revalidation
      fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            // Token expired or invalid
            localStorage.clear();
            setUser(null);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data && data.id) {
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            subscribeUserToPush(token);
          }
        })
        .catch(err => {
          console.error('Background profile refresh failed:', err);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    subscribeUserToPush(token);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner"></div>
        <p>Memuat...</p>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isCourier = user?.role === 'courier';
  const useAdminLayout = isAdmin || isCourier;

  // Set body class for admin layout (removes navbar top padding)
  if (useAdminLayout) {
    document.body.classList.add('admin-mode');
  } else {
    document.body.classList.remove('admin-mode');
  }

  return (
    <BrowserRouter>
      <PageTransitionProgress />
      {/* Navbar hanya tampil di halaman non-admin */}
      {!useAdminLayout && <Navbar user={user} onLogout={handleLogout} />}
      {user && <QuickAccessBar user={user} />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        
        <Route path="/history" element={user ? <Suspense fallback={<PageLoader />}><OrderHistory /></Suspense> : <Navigate to="/login" />} />
        <Route path="/courier/history" element={user?.role === 'courier' ? <AdminLayout user={user} onLogout={handleLogout}><Suspense fallback={<PageLoader />}><CourierHistory /></Suspense></AdminLayout> : <Navigate to="/login" />} />

        <Route
          path="/dashboard"
          element={
            user ? (
              isAdmin ? (
                <AdminLayout user={user} onLogout={handleLogout}>
                  <Suspense fallback={<PageLoader />}>
                    <AdminDashboard />
                  </Suspense>
                </AdminLayout>
              ) : isCourier ? (
                <AdminLayout user={user} onLogout={handleLogout}>
                  <Suspense fallback={<PageLoader />}>
                    <CourierDashboard />
                  </Suspense>
                </AdminLayout>
              ) : (
                <Suspense fallback={<PageLoader />}>
                  <CustomerDashboard user={user} />
                </Suspense>
              )
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/order"
          element={user?.role === 'customer' ? <Suspense fallback={<PageLoader />}><OrderForm /></Suspense> : <Navigate to="/login" />}
        />

        <Route
          path="/services"
          element={
            user?.role === 'admin' ? (
              <AdminLayout user={user} onLogout={handleLogout}>
                <Suspense fallback={<PageLoader />}>
                  <ServicesManagement />
                </Suspense>
              </AdminLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/offline-order"
          element={
            user?.role === 'admin' ? (
              <AdminLayout user={user} onLogout={handleLogout}>
                <Suspense fallback={<PageLoader />}>
                  <OfflineOrderForm />
                </Suspense>
              </AdminLayout>
            ) : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;