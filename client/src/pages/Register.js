import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { showSuccess, showError, showWarning, showLoading, closeLoading } from '../utils/swal';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin, FiEye, FiEyeOff, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import GetMyLocation from '../components/GetMyLocation';

const Register = ({ onLogin }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    address_note: '',
    lat: null,
    lng: null,
    google_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
        // Belum terdaftar -> prefill langsung di halaman registrasi ini!
        const { name, email, google_id } = res.data.googleData;
        setForm(prev => ({
          ...prev,
          name: name || '',
          email: email || '',
          google_id: google_id || '',
        }));
        showSuccess('Akun Google Terhubung', 'Silakan lengkapi nomor WhatsApp dan alamat Anda untuk mendaftar.');
      } else {
        showSuccess('Selamat Datang!', `Berhasil masuk sebagai ${res.data.user.name}!`);
        if (onLogin) {
          onLogin(res.data.user, res.data.token);
        }
        navigate('/dashboard');
      }
    } catch (err) {
      closeLoading();
      const msg = err.response?.data?.message || 'Registrasi dengan Google gagal.';
      showError('Google Registrasi Gagal', msg);
    }
  };

  useEffect(() => {
    if (location.state?.googleData) {
      const { name, email, google_id } = location.state.googleData;
      setForm(prev => ({
        ...prev,
        name: name || '',
        email: email || '',
        google_id: google_id || '',
      }));
    }
  }, [location.state]);

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
            width: '320', 
            text: 'signup_with',
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Password strength checks
  const pwChecks = useMemo(() => ({
    minLength: form.password.length >= 8,
    hasUpper: /[A-Z]/.test(form.password),
    hasLower: /[a-z]/.test(form.password),
    hasNumber: /\d/.test(form.password),
  }), [form.password]);

  const allPwValid = pwChecks.minLength && pwChecks.hasUpper && pwChecks.hasLower && pwChecks.hasNumber;

  const handleLocationReady = (lat, lng, alamat) => {
    setForm(prev => ({ ...prev, address: alamat, lat, lng }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.google_id && !allPwValid) {
      showWarning('Password Kurang Kuat', 'Password Anda belum memenuhi semua persyaratan keamanan.');
      return;
    }
    setLoading(true);
    showLoading('Sedang Mendaftar', 'Mohon tunggu sebentar...');
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const res = await axios.post(`${base}/api/auth/register`, form);
      closeLoading();
      
      if (res.data.token && res.data.user) {
        showSuccess('Registrasi Berhasil', 'Akun Anda berhasil dibuat dan otomatis masuk! 🚀');
        if (onLogin) {
          onLogin(res.data.user, res.data.token);
        }
        navigate('/dashboard');
      } else {
        await showSuccess('Registrasi Berhasil', 'Registrasi berhasil! Silakan masuk ke akun Anda.');
        navigate('/login');
      }
    } catch (err) {
      closeLoading();
      if (!err.response) {
        showError('Registrasi Gagal', 'Koneksi ke server gagal. Pastikan server backend sudah dijalankan di local (port 5000) dan tidak terblokir. 🔌');
        return;
      }
      // Handle express-validator error array format
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        const messages = data.errors.map(e => e.msg).join('\n');
        showError('Registrasi Gagal', messages);
      } else {
        showError('Registrasi Gagal', data?.message || data?.error || 'Gagal mendaftar. Silakan coba kembali.');
      }
    } finally {
      setLoading(false);
    }
  };

  const PwCheck = ({ ok, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: ok ? '#16a34a' : '#9ca3af', transition: 'color 0.2s' }}>
      {ok ? <FiCheck style={{ color: '#16a34a' }} /> : <FiX style={{ color: '#d1d5db' }} />}
      {label}
    </div>
  );

  return (
    <div className="register-page">
      <div className="register-box">
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: 14 }}>
          <FiArrowLeft /> Kembali ke Beranda
        </Link>
        <h2>Buat Akun Baru</h2>
        <p style={{ color: 'var(--navy-30)', fontSize: '0.9rem', marginBottom: 20 }}>
          {form.google_id 
            ? 'Akun Google Anda berhasil terhubung! Tinggal selangkah lagi untuk menyelesaikan pendaftaran.' 
            : 'Daftar untuk mulai menggunakan layanan Alinea Laundry'}
        </p>

        {!form.google_id && (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '44px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
            <div id="googleButton"></div>
          </div>
        )}

        {form.google_id && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            borderRadius: '16px', 
            padding: '12px 16px', 
            marginBottom: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '0.85rem',
            color: 'var(--navy-60)'
          }}>
            <img src="/images/logo-square.png" alt="Google Connected" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fff', padding: '2px' }} onError={(e) => {e.target.style.display='none'}} />
            <div>
              <strong style={{ color: '#3b82f6', display: 'block' }}>Terhubung dengan Google OAuth2</strong>
              Melanjutkan registrasi menggunakan email <strong>{form.email}</strong>.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <input
                name="name"
                type="text"
                placeholder="Muhammad Saiful Robbani"
                value={form.name}
                onChange={handleChange}
                disabled={!!form.google_id}
                style={form.google_id ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                name="email"
                type="email"
                placeholder="saiful@gmail.com"
                value={form.email}
                onChange={handleChange}
                disabled={!!form.google_id}
                style={form.google_id ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                required
              />
            </div>
          </div>

          {!form.google_id && (
            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Buat password yang kuat"
                  value={form.password}
                  onChange={handleChange}
                  required={!form.google_id}
                />
                <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
              {/* Password strength indicator */}
              {form.password.length > 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <PwCheck ok={pwChecks.minLength} label="Min. 8 karakter" />
                    <PwCheck ok={pwChecks.hasUpper} label="Huruf besar (A-Z)" />
                    <PwCheck ok={pwChecks.hasLower} label="Huruf kecil (a-z)" />
                    <PwCheck ok={pwChecks.hasNumber} label="Angka (0-9)" />
                  </div>
                  {/* Strength bar */}
                  <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 4,
                      transition: 'width 0.3s, background 0.3s',
                      width: `${Object.values(pwChecks).filter(Boolean).length * 25}%`,
                      background: allPwValid ? '#16a34a' : Object.values(pwChecks).filter(Boolean).length >= 2 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Nomor WhatsApp <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>(wajib)</span></label>
            <div className="input-wrapper">
              <FiPhone className="input-icon" />
              <input
                name="phone"
                type="text"
                placeholder="081234567890"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Alamat Lengkap <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>(wajib)</span></label>
            <div className="input-wrapper">
              <FiMapPin className="input-icon" />
              <textarea
                name="address"
                placeholder="Jl. Gajah Mada No. 123, Semarang"
                value={form.address}
                onChange={handleChange}
                rows={2}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
            {/* Location tracking button */}
            <GetMyLocation onLocationReady={handleLocationReady} />
          </div>

          <div className="input-group">
            <label className="input-label">Catatan Alamat <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>(wajib)</span></label>
            <div className="input-wrapper">
              <FiMapPin className="input-icon" />
              <input
                name="address_note"
                type="text"
                placeholder="Contoh: Kos warna biru, lantai 2"
                value={form.address_note}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            className="btn login-submit-btn"
            type="submit"
            style={{ marginTop: 16 }}
            disabled={loading || (!form.google_id && !allPwValid)}
          >
            {loading ? 'Mendaftar...' : 'Selesaikan Pendaftaran'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--navy-60)' }}>
          Sudah punya akun? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Masuk sekarang</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
