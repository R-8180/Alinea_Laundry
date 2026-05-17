import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const res = await axios.post(`${base}/api/auth/login`, { email, password });
      onLogin(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Login gagal';
      alert(msg);
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
