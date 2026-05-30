import React from 'react';
import {
  FiMapPin, FiClock, FiFacebook, FiInstagram, FiNavigation
} from 'react-icons/fi';
import { FaTiktok, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  const branches = [
    {
      name: 'Cabang Talangsari (Pusat)',
      address: 'Jl. Talangsari No.36A, Bendan Duwur, Kec. Gajahmungkur, Kota Semarang',
      phone: '0878-3119-7676',
      mapLink: 'https://maps.app.goo.gl/wS7tWexyX48c66Q66',
      isMain: true
    },
    {
      name: 'Cabang Unnes (Gunungpati)',
      address: 'Jl. Sekarang No.10, Sekaran, Kec. Gunungpati, Kota Semarang',
      phone: '0878-3119-7676',
      mapLink: 'https://maps.google.com/?q=Alinea+Laundry+Sekaran+Unnes',
      isMain: false
    },
    {
      name: 'Cabang Tlogosari (Pedurungan)',
      address: 'Jl. Tlogosari Raya No.24, Muktiharjo Kidul, Kec. Pedurungan, Kota Semarang',
      phone: '0878-3119-7676',
      mapLink: 'https://maps.google.com/?q=Alinea+Laundry+Tlogosari+Pedurungan',
      isMain: false
    }
  ];

  const admins = [
    { name: 'Admin Pusat (Talangsari)', phone: '0878-3119-7676', waLink: 'https://wa.me/6287831197676' },
    { name: 'Admin Cabang (Unnes)', phone: '0878-3119-7676', waLink: 'https://wa.me/6287831197676' },
    { name: 'Admin Cabang (Tlogosari)', phone: '0878-3119-7676', waLink: 'https://wa.me/6287831197676' },
    { name: 'Layanan Express & Pickup', phone: '0878-3119-7676', waLink: 'https://wa.me/6287831197676' },
  ];

  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        {/* Kolom 1 – Brand + Sosmed */}
        <div className="footer-col-brand">
          <div className="footer-brand">
            <img src="/images/logoalinea.png" alt="Alinea Laundry Logo" className="footer-logo" />
            <h4>Alinea Laundry</h4>
          </div>
          <p className="brand-tagline">
            Layanan laundry premium terbaik di Semarang. Bersih, wangi, rapi, dan praktis tanpa keluar rumah.
          </p>
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
          </div>
        </div>



        {/* Kolom 3 – 4 Admin WhatsApp */}
        <div className="footer-col-admins">
          <h4><FaWhatsapp className="icon-inline text-green" /> Chat Admin Kami</h4>
          <div className="admins-grid">
            {admins.map((admin, idx) => (
              <a key={idx} href={admin.waLink} target="_blank" rel="noreferrer" className="admin-chat-card">
                <div className="admin-icon-wa">
                  <FaWhatsapp />
                </div>
                <div className="admin-info-text">
                  <span className="admin-name">{admin.name}</span>
                  <span className="admin-phone">{admin.phone}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Kolom 4 – Jam Operasional */}
        <div className="footer-col-hours">
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

      {/* Peta Lokasi Utama & Rute Cepat */}
      <div className="footer-map-section">
        <div className="footer-map-container">
          <div className="map-iframe-wrapper">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6659.773634650516!2d110.39071490270577!3d-7.018090871695933!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708b002a865d33%3A0x509a93a229eff71d!2sAlinea%20Laundry!5e0!3m2!1sid!2sid!4v1777955161538!5m2!1sid!2sid"
              width="100%"
              height="280"
              style={{ border: 0, borderRadius: '16px' }}
              allowFullScreen=""
              loading="lazy"
              title="Lokasi Alinea Laundry Talangsari"
            />
          </div>
          
          <div className="map-quick-links">
            <h4 style={{ color: 'white', marginBottom: '18px', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '1.05rem', fontWeight: 700 }}>
              <FiMapPin className="icon-inline" style={{ color: 'var(--sky)' }} /> Lokasi Cabang Kami
            </h4>
            <div className="branches-list">
              {branches.map((branch, idx) => (
                <div key={idx} className={`branch-card-box ${branch.isMain ? 'main-branch' : 'sub-branch'}`}>
                  <div className="branch-header-row">
                    <h5>{branch.name}</h5>
                    {branch.isMain && <span className="badge-main">Pusat</span>}
                  </div>
                  <p className="branch-address">
                    <FiMapPin style={{ flexShrink: 0, marginTop: 3, marginRight: 6 }} />
                    <span>{branch.address}</span>
                  </p>
                  {!branch.isMain ? (
                    <a href={branch.mapLink} target="_blank" rel="noreferrer" className="btn-branch-map" aria-label={`Rute Maps menuju ${branch.name}`}>
                      <FiNavigation style={{ marginRight: 4 }} /> Rute Maps
                    </a>
                  ) : (
                    <span className="text-map-active"><FiMapPin className="icon-inline text-sky" /> Map Aktif di Samping</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="copyright">© 2026 Alinea Laundry. All rights reserved.</p>
    </footer>
  );
};

export default Footer;