import './App.css';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import QuickAccessBar from './components/QuickAccessBar';
import AdminLayout from './components/AdminLayout';

// Lazy load pages for ultimate performance and minimal initial bundle size!
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const OrderForm = lazy(() => import('./pages/OrderForm'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CourierDashboard = lazy(() => import('./pages/CourierDashboard'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const CourierHistory = lazy(() => import('./pages/CourierHistory'));
const ServicesManagement = lazy(() => import('./pages/ServicesManagement'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const apiBase = process.env.REACT_APP_API_URL || '';

    if (storedUser && token) {
      fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
          } else {
            localStorage.clear();
            setUser(null);
          }
        })
        .catch(() => {
          setUser(JSON.parse(storedUser));
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
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
      {/* Navbar hanya tampil di halaman non-admin */}
      {!useAdminLayout && <Navbar user={user} onLogout={handleLogout} />}
      {user && <QuickAccessBar user={user} />}

      <Suspense fallback={
        <div className="app-loading">
          <div className="app-loading-spinner"></div>
          <p>Memuat...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/history" element={user ? <OrderHistory /> : <Navigate to="/login" />} />
          <Route path="/courier/history" element={user?.role === 'courier' ? <AdminLayout user={user} onLogout={handleLogout}><CourierHistory /></AdminLayout> : <Navigate to="/login" />} />

          <Route
            path="/dashboard"
            element={
              user ? (
                isAdmin ? (
                  <AdminLayout user={user} onLogout={handleLogout}>
                    <AdminDashboard />
                  </AdminLayout>
                ) : isCourier ? (
                  <AdminLayout user={user} onLogout={handleLogout}>
                    <CourierDashboard />
                  </AdminLayout>
                ) : (
                  <CustomerDashboard />
                )
              ) : <Navigate to="/login" />
            }
          />

          <Route
            path="/order"
            element={user?.role === 'customer' ? <OrderForm /> : <Navigate to="/login" />}
          />

          <Route
            path="/services"
            element={
              user?.role === 'admin' ? (
                <AdminLayout user={user} onLogout={handleLogout}>
                  <ServicesManagement />
                </AdminLayout>
              ) : <Navigate to="/login" />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;