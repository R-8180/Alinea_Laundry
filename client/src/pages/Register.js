import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/register', form);
      alert('Registrasi berhasil, silakan login');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mendaftar');
    }
  };

  return (
    <div className="register-page">
      <div className="register-box">
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
                placeholder="Masukkan password Anda"
                value={form.password}
                onChange={handleChange}
                required
              />
              <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
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
            <label className="input-label">Alamat</label>
            <div className="input-wrapper">
              <FiMapPin className="input-icon" />
              <textarea
                name="address"
                placeholder="Jl. Gajah Mada No. 123, Semarang"
                value={form.address}
                onChange={handleChange}
                rows={2}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <button className="btn login-submit-btn" type="submit" style={{ marginTop: 16 }}>
            Daftar
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
