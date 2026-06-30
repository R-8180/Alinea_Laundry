/**
 * ============================================================
 * HTTP CLIENT TERPUSAT — Alinea Laundry
 * ============================================================
 * Semua pemanggilan API dari frontend harus menggunakan file ini.
 * Manfaat:
 * 1. Token Authorization otomatis di-attach tanpa harus tulis manual di 40+ tempat
 * 2. Auto-logout kalau token expired (response 401)
 * 3. Base URL cukup dikonfigurasi 1x di sini
 * 4. resolveFileUrl cukup 1 definisi, tidak perlu copy-paste ke 6 file
 * ============================================================
 */

import axios from 'axios';

// Fungsi terpusat untuk resolve URL file (foto, bukti pembayaran, dll.)
// Sebelumnya: copy-paste identik di CustomerDashboard, Home, OrderHistory,
// CourierHistory, AdminDashboard, CourierDashboard — sekarang cukup 1 tempat
export function resolveFileUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = process.env.REACT_APP_API_URL || '';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Axios instance dengan base URL dari environment variable
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
});

// REQUEST INTERCEPTOR: Auto-attach token dari localStorage ke setiap request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: Auto-logout kalau server return 401 (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token sudah tidak valid — hapus data login dan arahkan ke halaman login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Pakai window.location agar state React di-reset sepenuhnya
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
