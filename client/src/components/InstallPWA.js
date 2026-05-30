import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiSmartphone, FiMonitor } from 'react-icons/fi';

/**
 * InstallPWA - Tombol install aplikasi
 * Variants:
 *  - "mobile-banner"  → hanya tampil di layar ≤768px (di atas Promo Spesial di Home)
 *  - "desktop-banner" → hanya tampil di layar >768px (di bawah Sosmed di Home)
 *  - "dashboard"      → banner subtle di Customer Dashboard
 */
const InstallPWA = ({ variant = 'mobile-banner' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Jika sudah diinstall sebagai standalone app → sembunyikan
    const inStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone;
    if (inStandaloneMode) { setIsInstalled(true); return; }

    // Deteksi iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (ios) setIsIOS(true);

    // Tangkap native Chrome install prompt
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Logika visibility berdasarkan variant & ukuran layar
  if (isInstalled || dismissed) return null;
  if (variant === 'mobile-banner' && !isMobile) return null;
  if (variant === 'desktop-banner' && isMobile) return null;

  const handleInstall = async () => {
    if (isIOS) { setShowGuide(true); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => { setDismissed(true); setShowGuide(false); };

  // ── Modal Panduan Manual ─────────────────────────────────────────────
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
        }} aria-label="Tutup Panduan">
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
            4. Konfirmasi dengan mengetuk <strong>"Install"</strong>.
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

  // ── VARIANT: DASHBOARD (subtle banner) ──────────────────────────────
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
            Pasang sebagai aplikasi di HP untuk pengalaman lebih baik.{' '}
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
          }} aria-label="Tutup" title="Tutup">
            <FiX size={14} />
          </button>
        </div>
        {showGuide && <GuideModal />}
      </>
    );
  }

  // ── VARIANT: MOBILE-BANNER (di atas Promo Spesial, mobile only) ──────
  if (variant === 'mobile-banner') {
    return (
      <>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, #0b1d3a 0%, #1e50a0 100%)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 20,
          position: 'relative', boxShadow: '0 4px 16px rgba(11,29,58,0.2)',
        }}>
          <FiSmartphone style={{ color: '#fff', fontSize: '1.6rem', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
              Install Aplikasi Alinea Laundry
            </p>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>
              Notifikasi real-time, order lebih mudah
            </p>
          </div>
          <button onClick={handleInstall} style={{
            background: '#fff', color: '#0b1d3a', border: 'none',
            borderRadius: 9, padding: '8px 14px', fontWeight: 700,
            fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <FiDownload size={14} /> Install
          </button>
          <button onClick={handleDismiss} style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', padding: 0,
          }} aria-label="Tutup Banner">
            <FiX size={14} />
          </button>
        </div>
        {showGuide && <GuideModal />}
      </>
    );
  }

  // ── VARIANT: DESKTOP-BANNER (di bawah Sosmed, desktop only) ─────────
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginTop: 32, marginBottom: 8, flexWrap: 'wrap',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <FiMonitor /> Tersedia juga sebagai aplikasi
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            Install langsung di laptop atau HP kamu
          </p>
        </div>
        <button
          id="pwa-install-btn-desktop"
          onClick={handleInstall}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #1e50a0 0%, #0b1d3a 100%)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '12px 24px', fontSize: '0.93rem', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(11,29,58,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(11,29,58,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(11,29,58,0.2)';
          }}
        >
          <FiDownload style={{ fontSize: '1.05rem' }} />
          Install Aplikasi Alinea Laundry
        </button>
      </div>
      {showGuide && <GuideModal />}
    </>
  );
};

export default InstallPWA;
