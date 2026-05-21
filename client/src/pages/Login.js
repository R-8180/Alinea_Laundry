import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { showError, showLoading, closeLoading } from '../utils/swal';
import { FcGoogle } from 'react-icons/fc';

const ADMIN_WA_NUMBER = '6281234567890'; // Ganti dengan nomor WA admin yang sebenarnya

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
    const waMessage = encodeURIComponent(
      `Halo Admin Alinea Laundry,\n\nSaya lupa password akun saya.\nEmail: ${email || '(belum diisi)'}\n\nMohon bantu reset password saya. Terima kasih.`
    );
    window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=${waMessage}`, '_blank');
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

        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
          <FcGoogle style={{ fontSize: '1.1rem' }} /> Masuk dengan Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--navy-60)' }}>
          Belum punya akun? <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
