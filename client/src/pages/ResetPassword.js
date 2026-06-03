import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/swal';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showError('Gagal', 'Token reset tidak valid atau tidak ditemukan di URL! ❌');
      return;
    }

    if (password.length < 6) {
      showError('Validasi Gagal', 'Password minimal harus memiliki panjang 6 karakter! ❌');
      return;
    }

    if (password !== confirmPassword) {
      showError('Validasi Gagal', 'Konfirmasi password tidak cocok dengan password baru! ❌');
      return;
    }

    showLoading('Menyimpan Password', 'Mohon tunggu sebentar...');
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const res = await axios.post(`${base}/api/auth/reset-password`, { token, password });
      closeLoading();
      await showSuccess('Password Diperbarui', res.data.message || 'Password Anda telah berhasil diperbarui!');
      navigate('/login');
    } catch (err) {
      closeLoading();
      if (!err.response) {
        showError('Gagal Reset Password', 'Koneksi ke server gagal. Pastikan server backend sudah dijalankan di local (port 5000) dan tidak terblokir. 🔌');
        return;
      }
      const data = err.response?.data;
      let msg = 'Terjadi kesalahan saat mengatur ulang password.';
      if (data) {
        if (typeof data.message === 'string') msg = data.message;
        else if (data.message && typeof data.message.message === 'string') msg = data.message.message;
        else if (typeof data.error === 'string') msg = data.error;
        else if (data.error && typeof data.error.message === 'string') msg = data.error.message;
        else if (typeof data === 'string') msg = data;
      }
      showError('Gagal Reset Password', msg);
    }
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
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: 14 }}>
          <FiArrowLeft /> Kembali ke Login
        </Link>
        <h2>Atur Ulang Sandi Baru</h2>
        <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: 20 }}>
          Masukkan password baru Anda di bawah ini untuk menggantikan kata sandi lama Anda yang lupa.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Password Baru</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Konfirmasi Password</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password baru Anda"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          <button className="btn login-submit-btn" type="submit" style={{ marginTop: 10 }}>
            Simpan Kata Sandi Baru
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
