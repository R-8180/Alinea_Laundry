import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiSmartphone } from 'react-icons/fi';

/**
 * InstallPWA - Komponen install aplikasi
 * Tombol SELALU muncul. Jika Chrome belum siap, tampilkan panduan manual.
 * @param {string} variant - "home" (mencolok) atau "dashboard" (subtle)
 */
const InstallPWA = ({ variant = 'home' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Kalau sudah jalan sebagai PWA standalone → sembunyikan
    const inStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone;
    if (inStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // Deteksi iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (ios) setIsIOS(true);

    // Tangkap native Chrome install prompt jika tersedia
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Jika berhasil diinstall
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS: selalu tampilkan panduan manual
      setShowGuide(true);
      return;
    }
    if (deferredPrompt) {
      // Chrome sudah siap → pakai native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      // Chrome belum siap → tampilkan panduan manual
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowGuide(false);
  };

  // Jangan tampilkan jika sudah diinstall atau ditutup
  if (isInstalled || dismissed) return null;

  // ── Modal Panduan Manual ────────────────────────────────────────────
  const GuideModal = () => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 24px',
        width: '100%', maxWidth: 380, position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <button onClick={() => setShowGuide(false)} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
        }}>
          <FiX size={20} />
        </button>
        <FiSmartphone style={{ fontSize: '2rem', color: '#1e50a0', marginBottom: 12 }} />
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: '#0b1d3a' }}>
          {isIOS ? 'Pasang di iPhone / Safari' : 'Cara Pasang Aplikasi'}
        </h3>
        {isIOS ? (
          <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem', lineHeight: 1.7 }}>
            1. Buka web ini di <strong>Safari</strong>.<br />
            2. Ketuk ikon <strong>Bagikan</strong> (kotak + panah ke atas) di toolbar bawah.<br />
            3. Gulir dan pilih <strong>"Tambahkan ke Layar Utama"</strong>.<br />
            4. Ketuk <strong>"Tambah"</strong> di pojok kanan atas.
          </p>
        ) : (
          <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem', lineHeight: 1.7 }}>
            1. Buka web ini di <strong>Google Chrome</strong>.<br />
            2. Ketuk ikon <strong>tiga titik (⋮)</strong> di pojok kanan atas.<br />
            3. Pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install App"</strong>.<br />
            4. Konfirmasi dengan mengetuk <strong>"Install"</strong> / <strong>"Tambah"</strong>.
          </p>
        )}
        <button onClick={() => setShowGuide(false)} style={{
          marginTop: 20, width: '100%', padding: '11px',
          background: '#0b1d3a', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
        }}>
          Mengerti
        </button>
      </div>
    </div>
  );

  // ── VARIANT: DASHBOARD (Subtle) ─────────────────────────────────────
  if (variant === 'dashboard') {
    return (
      <>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, rgba(11,29,58,0.05) 0%, rgba(30,80,160,0.07) 100%)',
          border: '1px solid rgba(11,29,58,0.1)', borderRadius: 10,
          padding: '8px 14px', marginBottom: 14,
          fontSize: '0.82rem', color: 'var(--navy, #0b1d3a)', position: 'relative',
        }}>
          <FiSmartphone style={{ flexShrink: 0, color: '#3b82f6', fontSize: '1rem' }} />
          <span style={{ flex: 1 }}>
            Pasang sebagai aplikasi di HP kamu untuk pengalaman lebih baik.{' '}
            <button onClick={handleInstall} style={{
              background: 'none', border: 'none', color: '#3b82f6',
              fontWeight: 700, cursor: 'pointer', padding: 0,
              fontSize: 'inherit', textDecoration: 'underline',
            }}>
              Install sekarang
            </button>
          </span>
          <button onClick={handleDismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center',
          }} title="Tutup">
            <FiX size={14} />
          </button>
        </div>
        {showGuide && <GuideModal />}
      </>
    );
  }

  // ── VARIANT: HOME (Mencolok) ────────────────────────────────────────
  return (
    <>
      <button
        id="pwa-install-btn"
        onClick={handleInstall}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, #1e50a0 0%, #0b1d3a 100%)',
          color: '#fff', border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: 14, padding: '13px 28px',
          fontSize: '0.97rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(11,29,58,0.25)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(11,29,58,0.35)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(11,29,58,0.25)';
        }}
      >
        <FiDownload style={{ fontSize: '1.1rem' }} />
        Install Aplikasi Alinea Laundry
      </button>
      {showGuide && <GuideModal />}
    </>
  );
};

export default InstallPWA;
