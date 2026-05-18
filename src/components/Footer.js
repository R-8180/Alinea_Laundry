import React from 'react';
import {
  FiMapPin, FiPhone, FiClock, FiFacebook, FiInstagram, FiMessageCircle
} from 'react-icons/fi';
import { FaTiktok } from 'react-icons/fa';

const Footer = () => (
  <footer className="footer" id="contact">
    <div className="footer-content">
      {/* Kolom 1 – Brand + Alamat */}
      <div>
        <div className="footer-brand">
          <img src="/images/logoalinea.png" alt="Alinea Laundry Logo" className="footer-logo" />
          <h4>Alinea Laundry</h4>
        </div>
        <p>
          <FiMapPin style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Jl. Talangsari No.36A, Bendan Duwur,<br />
          Kec. Gajahmungkur, Kota Semarang
        </p>
        <p>
          <FiPhone style={{ verticalAlign: 'middle', marginRight: 6 }} />
          0812-2788-4654
        </p>
      </div>

      {/* Kolom 2 – Sosial Media Glassmorphism */}
      <div>
        <h4>Ikuti Kami</h4>
        <div className="social-glass-row">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-glass-btn" title="Facebook">
            <FiFacebook />
          </a>
          <a href="https://www.instagram.com/alinea.laundry" target="_blank" rel="noreferrer" className="social-glass-btn" title="Instagram">
            <FiInstagram />
          </a>
          <a href="https://www.tiktok.com/@alineahaikaliya" target="_blank" rel="noreferrer" className="social-glass-btn" title="TikTok">
            <FaTiktok />
          </a>
          <a href="https://wa.me/6281227884654" target="_blank" rel="noreferrer" className="social-glass-btn" title="WhatsApp">
            <FiMessageCircle />
          </a>
        </div>
      </div>

      {/* Kolom 3 – Jam Operasional dengan shape */}
      <div>
        <h4>
          <FiClock style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Jam Operasional
        </h4>
        <div className="operational-hours">
          <div className="hour-box">
            <span className="hour-label">FULL 7 Hari</span>
            <span className="hour-desc">Setiap Hari</span>
          </div>
          <div className="hour-box">
            <span className="hour-label">24 Jam</span>
            <span className="hour-desc">Layanan Non-stop</span>
          </div>
        </div>
      </div>
    </div>

    {/* Peta */}
    <div style={{ maxWidth: '960px', margin: '20px auto', padding: '0 16px' }}>
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6659.773634650516!2d110.39071490270577!3d-7.018090871695933!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708b002a865d33%3A0x509a93a229eff71d!2sAlinea%20Laundry!5e0!3m2!1sid!2sid!4v1777955161538!5m2!1sid!2sid"
          width="100%"
          height="250"
          style={{ border: 0, borderRadius: '16px' }}
          allowFullScreen=""
          loading="lazy"
          title="Lokasi Alinea Laundry"
        />
      </div>
    </div>

    <p className="copyright">© 2026 Alinea Laundry. All rights reserved.</p>
  </footer>
);

export default Footer;