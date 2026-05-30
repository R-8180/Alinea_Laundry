const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { registerValidation, loginValidation, validate } = require('../utils/validators');
const authMiddleware = require('../middleware/auth');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined');
}

const SECRET = process.env.JWT_SECRET;

// Register
router.post('/register', registerValidation, validate, async (req, res) => {
  const { name, email, password, address, address_note, phone, lat, lng, is_primary } = req.body;
  
  try {
    const checkEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Cek apakah nomor WA sudah digunakan oleh akun lain (hanya jika nomor diisi)
    if (phone && phone.trim() !== '') {
      const checkPhone = await pool.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone]
      );
      
      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ message: 'Nomor WhatsApp sudah digunakan oleh akun lain! ❌' });
      }
    }
    
    // Hash password 12 rounds
    const hash = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, address, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, email, hash, 'customer', address || '', phone || null]
    );
    
    const userId = result.rows[0].id;
    
    if (address && address.trim() !== '') {
      await pool.query(
        'INSERT INTO addresses (user_id, label, address, note, lat, lng, is_primary) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, 'Rumah', address, address_note || '', lat || null, lng || null, is_primary || false]
      );
    }
    
    res.status(201).json({ message: 'Registrasi berhasil' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', loginValidation, validate, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, email, password, role, name, phone, branch_id FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id },
      SECRET,
      { expiresIn: '2h' } // 2 hours
    );
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, branch_id: user.branch_id } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, points, address, phone, branch_id FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password - Minta reset link
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email wajib diisi ❌' });
  }

  try {
    // Cari user berdasarkan email
    const userRes = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      // Keamanan: Untuk mencegah user enumeration, tetap return 200 OK dengan pesan sukses
      return res.status(200).json({ message: 'Jika email terdaftar, instruksi reset password telah dikirim! 📩' });
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 jam dari sekarang

    // Simpan token reset dan waktu kedaluwarsa
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('⚠️ RESEND_API_KEY belum dikonfigurasi di file env. Lewati pengiriman email.');
      const devResetLink = `http://localhost:3000/reset-password?token=${token}`;
      console.log(`\n=======================================================\n[DEV MODE] LINK RESET PASSWORD:\n${devResetLink}\n=======================================================\n`);
      return res.status(200).json({ 
        message: 'Jika email terdaftar, instruksi reset password telah dikirim! (Mode Dev: Link reset dicetak di server log)' 
      });
    }

    const resetLink = `https://alinealaundry.web.id/reset-password?token=${token}`;
    const emailHtml = `
      <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 550px; margin: 0 auto; padding: 40px 30px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); background: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://alinealaundry.web.id/images/logo-square.png" alt="Alinea Laundry Logo" style="width: 70px; height: 70px; border-radius: 12px;" />
          <h2 style="color: #0f172a; margin-top: 16px; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">Atur Ulang Sandi Anda</h2>
          <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">Alinea Laundry - Bersih, Higienis & Premium</p>
        </div>
        
        <p style="color: #334155; font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px;">
          Halo <strong>${user.name}</strong>,
        </p>
        <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">
          Kami menerima permintaan untuk mengatur ulang kata sandi (password) akun Anda di Alinea Laundry. Klik tombol di bawah ini untuk mengatur ulang sandi baru Anda:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 30px; font-weight: 700; font-size: 0.9rem; display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); transition: transform 0.2s;">
            Atur Ulang Sandi
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 0.85rem; line-height: 1.6; margin-bottom: 20px; background: #f8fafc; padding: 12px 16px; border-radius: 12px; border: 1px solid #f1f5f9;">
          <strong>PENTING:</strong> Link di atas hanya berlaku selama <strong>1 jam</strong> sejak email ini dikirim demi keamanan akun Anda. Jika link tidak bisa diklik, salin alamat berikut ke browser Anda:<br/>
          <span style="color: #3b82f6; word-break: break-all;">${resetLink}</span>
        </p>
        
        <p style="color: #94a3b8; font-size: 0.8rem; line-height: 1.5; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          Jika Anda tidak merasa meminta ini, silakan abaikan email ini dengan aman. Sandi Anda tidak akan berubah.<br/>
          &copy; ${new Date().getFullYear()} Alinea Laundry. All rights reserved.
        </p>
      </div>
    `;

    // Kirim email menggunakan Resend API via fetch (Node 18+ global fetch)
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Alinea Laundry <no-reply@alinealaundry.web.id>',
          to: [email],
          subject: 'Atur Ulang Kata Sandi - Alinea Laundry',
          html: emailHtml
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Resend API error');
      }

      res.status(200).json({ message: 'Jika email terdaftar, instruksi reset password telah dikirim! 📩' });
    } catch (emailErr) {
      console.error('❌ Failed to send reset email via Resend:', emailErr.message || emailErr);
      const devResetLink = `http://localhost:3000/reset-password?token=${token}`;
      console.log(`\n=======================================================\n[DEV MODE FALLBACK] LINK RESET PASSWORD:\n${devResetLink}\n=======================================================\n`);
      res.status(200).json({ 
        message: 'Gagal mengirim email reset otomatis, tetapi token berhasil dibuat! (Mode Dev: Link reset dicetak di server log)' 
      });
    }

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password - Mengubah password dengan token
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Token dan password baru wajib diisi ❌' });
  }

  try {
    // Cari user yang memiliki token tersebut dan belum expired
    const userRes = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP',
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: 'Token reset tidak valid atau telah kedaluwarsa! ❌' });
    }

    const userId = userRes.rows[0].id;
    // Hash password baru (12 rounds)
    const hash = await bcrypt.hash(password, 12);

    // Update password dan hapus kolom token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, userId]
    );

    res.status(200).json({ message: 'Password Anda berhasil diperbarui! Silakan masuk kembali. ✅' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;