import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import Swal from 'sweetalert2';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Konfigurasi NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });
// Ubah warna default NProgress (opsional, bisa juga via CSS)
// Biarkan CSS bawaan, kita override di index.css nanti jika perlu

axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

// Axios Interceptors untuk Global Loading NProgress
let activeRequests = 0;

axios.interceptors.request.use(config => {
  if (activeRequests === 0) {
    NProgress.start();
  }
  activeRequests++;
  return config;
}, error => {
  return Promise.reject(error);
});

axios.interceptors.response.use(response => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    NProgress.done();
  }
  return response;
}, error => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    NProgress.done();
  }

  // Tangani kedaluwarsa sesi global (401 / 403)
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
    const currentPath = window.location.pathname;

    // Hanya log out dan redirect jika di halaman terproteksi
    if (!publicPaths.includes(currentPath)) {
      localStorage.clear();

      // Paksa tutup semua SweetAlert yang aktif agar layar tidak terkunci abu-abu
      try {
        Swal.close();
      } catch (e) {
        console.error('Error closing Swal:', e);
      }

      // Alihkan ke login dengan parameter
      window.location.href = '/login?expired=true';
    }
  }

  return Promise.reject(error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
