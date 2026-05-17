import './App.css';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import QuickAccessBar from './components/QuickAccessBar';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import OrderForm from './pages/OrderForm';
import AdminDashboard from './pages/AdminDashboard';
import CourierDashboard from './pages/CourierDashboard';
import OrderHistory from './pages/OrderHistory';
import CourierHistory from './pages/CourierHistory';
import ServicesManagement from './pages/ServicesManagement';

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
    </BrowserRouter>
  );
}

export default App;