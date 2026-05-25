import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showSuccess, showError, showWarning, showLoading } from '../utils/swal';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin, FiEye, FiEyeOff, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import GetMyLocation from '../components/GetMyLocation';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    address_note: '',
    lat: null,
    lng: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    if (!allPwValid) {
      showWarning('Password Kurang Kuat', 'Password Anda belum memenuhi semua persyaratan keamanan.');
      return;
    }
    setLoading(true);
    showLoading('Sedang Mendaftar', 'Mohon tunggu sebentar...');
    try {
      const base = process.env.REACT_APP_API_URL || '';
      await axios.post(`${base}/api/auth/register`, form);
      await showSuccess('Registrasi Berhasil', 'Registrasi berhasil! Silakan masuk ke akun Anda.');
      navigate('/login');
    } catch (err) {
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
          Daftar untuk mulai menggunakan layanan Alinea Laundry
        </p>

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
                required
              />
            </div>
          </div>

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
                required
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

          <div className="input-group">
            <label className="input-label">Nomor Telepon</label>
            <div className="input-wrapper">
              <FiPhone className="input-icon" />
              <input
                name="phone"
                type="text"
                placeholder="081234567890"
                value={form.phone}
                onChange={handleChange}
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
            disabled={loading || !allPwValid}
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
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
