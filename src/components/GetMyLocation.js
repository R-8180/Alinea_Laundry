import React, { useState } from 'react';

const GetMyLocation = ({ onLocationReady }) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung browser ini');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });

        // Reverse geocoding gratis pakai Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const alamat = data.display_name || 'Alamat tidak ditemukan';
          setAddress(alamat);
          if (onLocationReady) onLocationReady(lat, lng, alamat);
        } catch (err) {
          const fallbackAlamat = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
          setAddress(fallbackAlamat);
          if (onLocationReady) onLocationReady(lat, lng, fallbackAlamat);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        alert('Gagal mendapatkan lokasi. Pastikan GPS/Lokasi diaktifkan dan berikan perizinan.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ margin: '12px 0' }}>
      <button 
        type="button" 
        className="btn btn-secondary" 
        onClick={handleGetLocation} 
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          fontSize: '0.85rem',
          fontWeight: 600,
          background: 'var(--sky-pale)',
          border: '1px solid var(--sky)',
          color: 'var(--blue)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '🔍 Mencari lokasi saya...' : '📍 Gunakan lokasi saya saat ini'}
      </button>
      {location && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
          <span style={{ color: '#16a34a', fontWeight: 600, display: 'block', marginBottom: 2 }}>✓ Lokasi Berhasil Ditemukan</span>
          <strong>Alamat:</strong> {address}
        </div>
      )}
    </div>
  );
};

export default GetMyLocation;