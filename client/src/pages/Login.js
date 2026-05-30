import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { showError, showLoading, closeLoading, showSuccess } from '../utils/swal';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleCallback = async (response) => {
    showLoading('Sedang Masuk', 'Menghubungkan ke Google...');
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const res = await axios.post(`${base}/api/auth/google-login`, {
        credential: response.credential
      });
      closeLoading();
      
      if (res.data.registered === false) {
        // User belum terdaftar -> Arahkan ke form registrasi lengkap
        showSuccess('Langkah Terakhir!', 'Akun Google terhubung! Silakan lengkapi nomor WhatsApp dan alamat Anda untuk mendaftar.');
        navigate('/register', { state: { googleData: res.data.googleData } });
      } else {
        showSuccess('Selamat Datang!', `Berhasil masuk sebagai ${res.data.user.name}!`);
        onLogin(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      closeLoading();
      const msg = err.response?.data?.message || 'Login dengan Google gagal.';
      showError('Google Login Gagal', msg);
    }
  };

  useEffect(() => {
    // Google Client ID Alinea Laundry
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '1009613909182-8avsol1bd05n2nd8gk54fu85oh0sio6g.apps.googleusercontent.com';

    const initGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById('googleButton'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: '320', // Width matches the container
            text: 'signin_with',
            shape: 'pill'
          }
        );
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initGoogle();
          clearInterval(interval);
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      // Bersihkan URL parameter agar rapi dan tidak berulang kali memunculkan pesan saat direfresh
      navigate('/login', { replace: true });
      showError('Sesi Berakhir 🛡️', 'Sesi masuk Anda telah berakhir demi keamanan. Silakan masuk kembali.');
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoading('Sedang Masuk', 'Mohon tunggu sebentar...');
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const res = await axios.post(`${base}/api/auth/login`, { email, password });
      closeLoading();
      onLogin(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      // Handle express-validator error format: { errors: [{msg: '...'}] }
      const msg = (Array.isArray(data?.errors) && data.errors[0]?.msg)
        ? data.errors[0].msg
        : (typeof data?.message === 'string' ? data.message
          : (typeof data?.error === 'string' ? data.error
            : 'Login gagal. Periksa email dan password Anda.'));
      showError('Login Gagal', msg);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className="login-page-centered">
      <div className="login-banner-top">
        <div 
          className="login-banner-image" 
          style={{ backgroundImage: "url('/images/banner-login.png')" }}
        />
      </div>

      <div className="login-box">
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: 14 }}>
          <FiArrowLeft /> Kembali ke Beranda
        </Link>
        <h2>Selamat Datang Kembali!</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                placeholder="Masukkan email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          {/* Lupa Sandi link */}
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--blue)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
            >
              Lupa Sandi?
            </button>
          </div>

          <button className="btn login-submit-btn" type="submit">
            Masuk
          </button>
        </form>

        <p style={{ textAlign: 'center', margin: '14px 0 10px', color: 'var(--navy-30)', fontSize: '0.85rem' }}>
          atau masuk dengan
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '44px', marginBottom: '8px' }}>
          <div id="googleButton"></div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--navy-60)' }}>
          Belum punya akun? <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
