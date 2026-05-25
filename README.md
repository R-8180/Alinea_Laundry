# Alinea Laundry - Management System 👔✨

Alinea Laundry adalah sistem manajemen binatu (*laundry*) modern berbasis web (*Fullstack Web Application*) yang dirancang khusus untuk mempermudah operasional tiga sisi sekaligus: **Pelanggan**, **Kurir**, dan **Admin**.

Aplikasi ini mengusung antarmuka pengguna (*User Interface*) yang sangat modern, responsif, dan dinamis, serta sistem notifikasi waktu nyata.

---

## 🚀 Fitur Utama

### 📱 Panel Pelanggan (Customer)
- **Dashboard Tracking:** Lacak status pesanan secara *real-time* (Menunggu -> Dijemput -> Dicuci -> Diantar -> Selesai).
- **Order Online:** Pemesanan mudah dengan fitur *auto-detect* lokasi GPS untuk penjemputan.
- **Notifikasi Lonceng:** Pemberitahuan otomatis ketika kurir menjemput, barang selesai dicuci, dan siap diantar.
- **Pembayaran QRIS:** Upload bukti bayar secara instan melalui sistem.

### 🚚 Portal Kurir (Courier)
- **Manajemen Penjemputan & Pengantaran:** Lihat daftar pesanan yang harus segera diproses berdasarkan lokasi.
- **Upload Bukti Foto:** Wajib mengunggah foto ketika barang dijemput dari pelanggan dan diantar kembali.
- **Notifikasi Penugasan & Overdue:** Bel peringatan otomatis jika ada pesanan baru yang di-assign, dipindah-tangankan, atau jika waktu pengerjaan telah *overdue* (melebihi estimasi waktu).
- **Direct WhatsApp:** Tombol panggil WhatsApp instan ke Pelanggan atau rekan sesama Admin/Kurir untuk koordinasi operasional.

### 💻 Dashboard Admin
- **Manajemen Pesanan:** Atur *assignment* pesanan kepada kurir, ubah estimasi hari/jam, dan validasi pembayaran.
- **Manajemen Layanan:** Tambah, edit, dan atur layanan *laundry* (Kiloan, Satuan, Express, Reguler, dll).
- **Manajemen Cabang & User:** Dukungan multy-branch (Cabang Sampangan, Unnes, Tlogosari) serta *role management* (Pelanggan, Kurir, Admin).
- **Laporan & Analytics:** Lihat ringkasan pendapatan, performa kurir, dan pesanan aktif harian.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

Aplikasi ini dibangun menggunakan arsitektur modular yang memisahkan antara **Client (Frontend)** dan **Server (Backend)**.

### Frontend (`/client`)
- **Library Utama:** React.js (Create React App)
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **UI & Ikon:** Vanilla CSS (Responsive Design), React-Icons
- **Feedback & Alerts:** SweetAlert2
- **Loading State:** NProgress

### Backend (`/server`)
- **Runtime & Framework:** Node.js, Express.js
- **Database:** PostgreSQL (Di-host via Supabase)
- **Driver Database:** `pg` (Node Postgres)
- **Keamanan:** JSON Web Token (JWT) untuk Otentikasi, Bcrypt untuk *Hashing* Password.
- **File Upload & Storage:** Multer (Middleware) + Supabase Storage API untuk foto bukti transaksi.

### Infrastruktur & Deployment
- **Frontend & Backend Hosting:** Vercel (Serverless Functions untuk backend).
- **Database Hosting:** Supabase.
- **Version Control:** Git & GitHub.

---

## 📂 Struktur Direktori

```text
Alinea_Laundry/
├── client/                     # Folder React Frontend
│   ├── public/                 # File statis (favicon, index.html)
│   └── src/                    
│       ├── components/         # Komponen UI Reusable (Navbar, Layout, Maps)
│       ├── pages/              # Halaman Utama (Dashboard, Order, Register, Login)
│       ├── utils/              # Helper functions (SweetAlert, dll)
│       └── App.js              # Entry point React & Router
├── server/                     # Folder Node.js Backend
│   ├── middleware/             # Middleware otentikasi JWT (auth.js)
│   ├── routes/                 # API Endpoints (admin, courier, orders, users)
│   ├── utils/                  # Helper untuk Supabase Storage & Notifications
│   ├── db.js                   # Konfigurasi koneksi PostgreSQL
│   └── index.js                # Entry point server Express
└── vercel.json                 # Konfigurasi deployment untuk Vercel
```

---

## ⚙️ Cara Menjalankan Aplikasi di Local (Development)

Jika Anda ingin mengembangkan aplikasi secara *offline/local*, ikuti panduan berikut:

### 1. Persiapan Awal
Pastikan komputer Anda sudah terinstal **Node.js (minimal v16)** dan **Git**.

### 2. Kloning Repositori
```bash
git clone https://github.com/R-8180/Alinea_Laundry.git
cd Alinea_Laundry
```

### 3. Setup Konfigurasi `.env`
Di dalam folder root `Alinea_Laundry/`, buat atau *copy* file `.env` berdasarkan `template .env.example`. File ini harus berisi kredensial Supabase dan pengaturan *secret* JWT.
```env
# Contoh isi .env
PORT=5000
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxx.supabase.co:5432/postgres
JWT_SECRET=rahasia_jwt_super_aman
SUPABASE_URL=https://xxxxxx.supabase.co
SUPABASE_KEY=eyJh......
```

### 4. Menjalankan Backend (Server)
Buka terminal baru, masuk ke folder `server`:
```bash
cd server
npm install
npm run dev
```
*(Server backend akan berjalan di `http://localhost:5000`)*

### 5. Menjalankan Frontend (Client)
Buka terminal lain, masuk ke folder `client`:
```bash
cd client
npm install
npm start
```
*(React app akan otomatis terbuka di browser pada `http://localhost:3000`)*

---

## 📦 Deployment ke Vercel

Proyek ini telah dikonfigurasi untuk *One-Click Deployment* di **Vercel** melalui file `vercel.json`.
1. Sambungkan repositori GitHub ini ke dashboard Vercel.
2. Tambahkan semua *Environment Variables* (isi dari `.env`) ke menu **Settings > Environment Variables** di Vercel.
3. Klik **Deploy** dan Vercel akan secara otomatis membangun React (client) dan menyiapkan fungsi Serverless (backend).

---
*Didesain dan dikembangkan khusus untuk kelancaran bisnis Alinea Laundry. © 2026*
