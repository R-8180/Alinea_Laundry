import React, { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { FiCamera, FiUpload, FiX, FiCheckCircle, FiLoader, FiZap, FiAlertTriangle } from 'react-icons/fi';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,           // max 500KB
  maxWidthOrHeight: 1280,   // max resolusi 1280px
  useWebWorker: true,
  fileType: 'image/jpeg',
};

/**
 * PhotoUploader - komponen reusable untuk upload foto dengan:
 * - Pilih dari file / galeri
 * - Jepret langsung dari kamera (getUserMedia)
 * - Auto kompresi foto ke ≤ 500KB
 * - Preview foto setelah dipilih
 *
 * Props:
 * - onPhoto(file)  : callback ketika foto sudah siap (sudah dikompresi)
 * - photo          : file foto yang sudah dipilih (untuk controlled state)
 * - label          : label opsional di atas uploader
 * - required       : tampilkan tanda *wajib
 */
export default function PhotoUploader({ onPhoto, photo, label, required = false }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [camError, setCamError] = useState('');
  const [compressionLog, setCompressionLog] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ------ KOMPRESI ------
  const compress = async (file) => {
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      // Beri nama file yang wajar
      const named = new File([compressed], file.name || 'photo.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(named);
      
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedKb = (compressed.size / 1024).toFixed(0);
      setCompressionLog(`Dikompres dari ${originalSize} MB ➔ ${compressedKb} KB`);
      
      setPreview(previewUrl);
      onPhoto(named);
    } catch (err) {
      console.error('Kompresi gagal:', err);
      // Fallback: kirim file asli jika kompresi gagal
      setPreview(URL.createObjectURL(file));
      onPhoto(file);
    } finally {
      setCompressing(false);
    }
  };

  // ------ FILE PICKER ------
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await compress(file);
  };

  // ------ BUKA KAMERA ------
  const openCamera = async () => {
    setCamError('');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setCamError('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan di browser.');
      console.error('Camera error:', err);
    }
  };

  // ------ TUTUP KAMERA ------
  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCamError('');
  }, []);

  // ------ JEPRET FOTO ------
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    closeCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `kamera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await compress(file);
    }, 'image/jpeg', 0.92);
  };

  // ------ HAPUS FOTO ------
  const clearPhoto = () => {
    setPreview(null);
    setCompressionLog('');
    onPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {/* Label */}
      {label && (
        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <FiCamera style={{ marginRight: 2 }} />
          {label}
          {required && <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 4 }}>*wajib</span>}
        </label>
      )}

      {/* Upload Area */}
      <div style={{
        border: `2px dashed ${photo ? '#86efac' : required ? '#fca5a5' : '#c7d2fe'}`,
        borderRadius: 12,
        padding: '14px 16px',
        background: photo ? '#f0fdf4' : '#f8faff',
        transition: 'all 0.2s',
      }}>
        {compressing ? (
          <div style={{ textAlign: 'center', padding: '8px 0', color: '#6366f1' }}>
            <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '1.4rem', marginBottom: 4 }} />
            <p style={{ fontSize: '0.8rem', margin: 0 }}>Mengompresi foto...</p>
          </div>
        ) : preview ? (
          /* Preview setelah foto dipilih */
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt="Preview"
              style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <FiCheckCircle style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {photo?.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', flexShrink: 0 }}>
                <FiZap style={{ verticalAlign: 'middle', marginRight: 2 }} />
                {photo ? (photo.size / 1024).toFixed(0) + ' KB' : ''}
              </span>
              <button
                type="button"
                onClick={clearPhoto}
                style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}
              >
                <FiX />
              </button>
            </div>
            {compressionLog && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '4px 8px', borderRadius: 6, textAlign: 'center', fontWeight: 600 }}>
                {compressionLog}
              </div>
            )}
          </div>
        ) : (
          /* Tombol pilih foto */
          <div style={{ textAlign: 'center' }}>
            <FiCamera style={{ fontSize: '1.8rem', color: '#94a3b8', marginBottom: 6 }} />
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10 }}>
              Foto dikompresi otomatis &lt; 500KB
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Tombol Pilih File */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--navy, #1e293b)', color: 'white',
                  fontSize: '0.82rem', fontWeight: 600, border: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <FiUpload />
                Pilih Foto
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Tombol Buka Kamera */}
              <button
                type="button"
                onClick={openCamera}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  background: '#6366f1', color: 'white',
                  fontSize: '0.82rem', fontWeight: 600, border: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <FiCamera />
                Buka Kamera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {required && !photo && !compressing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: '0.82rem', marginTop: 10, fontWeight: 500, fontFamily: 'Outfit, sans-serif' }}>
          <FiAlertTriangle /> Foto wajib diupload untuk memproses pesanan
        </div>
      )}

      {/* Canvas tersembunyi untuk capture kamera */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Modal Kamera */}
      {cameraOpen && (
        <div
          onClick={closeCamera}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1e293b', borderRadius: 20, overflow: 'hidden',
              width: '100%', maxWidth: 480,
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header modal kamera */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 700 }}>
                <FiCamera /> Ambil Foto
              </div>
              <button
                onClick={closeCamera}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer' }}
              >
                <FiX />
              </button>
            </div>

            {/* Viewfinder */}
            {camError ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#fca5a5' }}>
                <FiCamera style={{ fontSize: '2.5rem', marginBottom: 12 }} />
                <p style={{ fontSize: '0.85rem' }}>{camError}</p>
                <button
                  onClick={closeCamera}
                  style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  Tutup
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', background: 'black' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }}
                />
                {/* Overlay guide */}
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '3px solid rgba(99,102,241,0.6)',
                  borderRadius: 4,
                  pointerEvents: 'none',
                }} />
              </div>
            )}

            {/* Footer tombol jepret */}
            {!camError && (
              <div style={{ display: 'flex', gap: 12, padding: 20, justifyContent: 'center' }}>
                <button
                  onClick={closeCamera}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  onClick={capturePhoto}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 12,
                    background: '#6366f1', color: 'white',
                    border: '3px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 0 0 4px rgba(99,102,241,0.3)',
                  }}
                >
                  <FiCamera style={{ fontSize: '1.2rem' }} />
                  Jepret!
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
