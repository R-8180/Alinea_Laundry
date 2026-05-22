import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiSmartphone } from 'react-icons/fi';

/**
 * InstallPWA - Komponen untuk meminta user menginstall aplikasi
 * @param {string} variant - "home" (mencolok) atau "dashboard" (subtle)
 */
const InstallPWA = ({ variant = 'home' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Deteksi iOS/Safari
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const inStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (ios && !inStandaloneMode) {
      setIsIOS(true);
      const dismissedBefore = sessionStorage.getItem('pwa-ios-dismissed');
      if (!dismissedBefore) setShowButton(true);
      return;
    }

    if (inStandaloneMode) return; // Sudah terinstal, sembunyikan

    // Tangkap event beforeinstallprompt dari Chrome Android / Desktop
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissedBefore = sessionStorage.getItem('pwa-dismissed');
      if (!dismissedBefore) setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowButton(false);
    setShowIOSGuide(false);
    sessionStorage.setItem(isIOS ? 'pwa-ios-dismissed' : 'pwa-dismissed', '1');
  };

  if (!showButton || dismissed) return null;

  // ============================================================
  // VARIANT: DASHBOARD (Subtle - banner kecil di atas)
  // ============================================================
  if (variant === 'dashboard') {
    return (
      <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'linear-gradient(135deg, rgba(11,29,58,0.06) 0%, rgba(30,80,160,0.08) 100%)',
          border: '1px solid rgba(11,29,58,0.12)',
          borderRadius: 10,
          padding: '8px 14px',
          marginBottom: 14,
          fontSize: '0.82rem',
          color: 'var(--navy, #0b1d3a)',
          position: 'relative',
        }}>
          <FiSmartphone style={{ flexShrink: 0, color: '#3b82f6', fontSize: '1rem' }} />
          <span style={{ flex: 1 }}>
            Pasang sebagai aplikasi di HP kamu untuk notifikasi lebih mudah.{' '}
            <button
              onClick={handleInstall}
              style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Install sekarang
            </button>
          </span>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center',
            }}
            title="Tutup"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* iOS Guide Modal */}
        {showIOSGuide && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
            <div style={{
              background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 24px 32px',
              width: '100%', maxWidth: 480, position: 'relative',
            }}>
              <button onClick={handleDismiss} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={20} />
              </button>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: '#0b1d3a' }}>Pasang di iPhone / Safari</h3>
              <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                1. Ketuk ikon <strong>Bagikan</strong> (kotak dengan panah ke atas) di toolbar Safari.<br />
                2. Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama"</strong>.<br />
                3. Ketuk <strong>"Tambah"</strong> di pojok kanan atas.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ============================================================
  // VARIANT: HOME (Mencolok - tombol penuh di hero/banner)
  // ============================================================
  return (
    <>
      <button
        id="pwa-install-btn"
        onClick={handleInstall}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'linear-gradient(135deg, #1e50a0 0%, #0b1d3a 100%)',
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: 14,
          padding: '13px 28px',
          fontSize: '0.97rem',
          fontWeight: 700,
          cursor: 'pointer',
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

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px 24px',
            width: '100%', maxWidth: 380, position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <button onClick={handleDismiss} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <FiX size={20} />
            </button>
            <FiSmartphone style={{ fontSize: '2.2rem', color: '#1e50a0', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#0b1d3a' }}>Pasang di iPhone / Safari</h3>
            <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
              1. Ketuk ikon <strong>Bagikan</strong> (kotak dengan panah ke atas) di toolbar Safari.<br />
              2. Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama"</strong>.<br />
              3. Ketuk <strong>"Tambah"</strong> di pojok kanan atas.
            </p>
            <button
              onClick={handleDismiss}
              style={{
                marginTop: 16, width: '100%', padding: '11px', background: '#0b1d3a',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9rem',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
