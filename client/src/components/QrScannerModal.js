import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { FiCheckCircle, FiXCircle, FiCamera, FiX } from 'react-icons/fi';

const QrScannerModal = ({ onClose, onSuccess }) => {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { success, message, order }
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []); // eslint-disable-line

  const startScanner = async () => {
    if (!scannerRef.current) return;
    const qr = new Html5Qrcode('qr-reader-admin');
    html5QrRef.current = qr;
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleScan,
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Kamera gagal:', err);
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) {
          await html5QrRef.current.stop();
        }
        html5QrRef.current.clear();
      } catch {}
      html5QrRef.current = null;
    }
  };

  const handleScan = async (decodedText) => {
    if (loading || result) return;
    await stopScanner();
    setScanning(false);
    setLoading(true);

    try {
      const res = await axios.post(
        '/api/orders/scan-qr',
        { order_code: decodedText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult({ success: true, message: res.data.message, order: res.data.order });
      if (onSuccess) onSuccess();
    } catch (err) {
      const data = err.response?.data;
      setResult({
        success: false,
        message: data?.message || 'Gagal memvalidasi QR',
        order: data?.order || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setLoading(false);
    startScanner();
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const statusLabels = {
    menunggu: 'Menunggu', pickup: 'Dijemput', cuci: 'Dicuci',
    antar: 'Diantar', selesai: 'Selesai', batal: 'Dibatalkan',
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 420, width: '95%' }}
      >
        {/* Header */}
        <div className="detail-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiCamera /> Scan QR Pesanan
          </h3>
          <button className="btn-close" onClick={handleClose}><FiX /></button>
        </div>

        {/* Scanner area */}
        {!result && (
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 14, textAlign: 'center' }}>
              Arahkan kamera ke QR code yang ada di layar customer
            </p>
            <div
              id="qr-reader-admin"
              ref={scannerRef}
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
                border: '2px solid var(--sky)',
                background: '#000',
                minHeight: 280,
              }}
            />
            {loading && (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--blue)', fontWeight: 600, fontSize: '0.9rem' }}>
                ⏳ Memvalidasi pesanan...
              </div>
            )}
            {!scanning && !loading && (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-4)', fontSize: '0.85rem' }}>
                Menginisialisasi kamera...
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ padding: '20px 24px', textAlign: 'center' }}>
            {result.success ? (
              <>
                <div style={{ fontSize: '4rem', color: '#10b981', marginBottom: 8 }}>
                  <FiCheckCircle />
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065f46', marginBottom: 4 }}>
                  ✅ Pesanan Selesai!
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-3)', marginBottom: 16 }}>
                  {result.message}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '4rem', color: '#ef4444', marginBottom: 8 }}>
                  <FiXCircle />
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7f1d1d', marginBottom: 4 }}>
                  ❌ Gagal
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-3)', marginBottom: 16 }}>
                  {result.message}
                </div>
              </>
            )}

            {/* Order info card */}
            {result.order && (
              <div style={{
                background: result.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'left',
                marginBottom: 20,
                fontSize: '0.88rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-3)' }}>Kode Order</span>
                  <strong>{result.order.order_code}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-3)' }}>Customer</span>
                  <span>{result.order.customer_name || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Status</span>
                  <strong style={{ color: result.success ? '#16a34a' : '#dc2626' }}>
                    {statusLabels[result.order.status] || result.order.status}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={handleClose}
              >
                Tutup
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={handleReset}
              >
                <FiCamera /> Scan Lagi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QrScannerModal;
