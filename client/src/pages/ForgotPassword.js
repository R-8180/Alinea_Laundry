import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/swal';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoading('Memproses Permintaan', 'Mohon tunggu sebentar...');
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const res = await axios.post(`${base}/api/auth/forgot-password`, { email });
      closeLoading();
      await showSuccess('Permintaan Sukses', res.data.message || 'Instruksi reset password telah dikirim ke email Anda.');
      navigate('/login');
    } catch (err) {
      closeLoading();
      if (!err.response) {
        showError('Gagal Meminta Reset', 'Koneksi ke server gagal. Pastikan server backend sudah dijalankan di local (port 5000) dan tidak terblokir. 🔌');
        return;
      }
      const data = err.response?.data;
      let msg = 'Terjadi kesalahan. Silakan coba lagi.';
      if (data) {
        if (typeof data.message === 'string') msg = data.message;
        else if (data.message && typeof data.message.message === 'string') msg = data.message.message;
        else if (typeof data.error === 'string') msg = data.error;
        else if (data.error && typeof data.error.message === 'string') msg = data.error.message;
        else if (typeof data === 'string') msg = data;
      }
      showError('Gagal Meminta Reset', msg);
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
        <h2>Lupa Kata Sandi?</h2>
        <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: 20 }}>
          Masukkan alamat email terdaftar Anda. Kami akan mengirimkan email berisi tautan (link) khusus untuk mengatur ulang sandi baru Anda secara aman.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Alamat Email</label>
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

          <button className="btn login-submit-btn" type="submit" style={{ marginTop: 10 }}>
            Kirim Link Reset
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
