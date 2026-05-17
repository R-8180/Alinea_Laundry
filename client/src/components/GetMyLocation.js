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
          setAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
          if (onLocationReady) onLocationReady(lat, lng, `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        alert('Gagal mendapatkan lokasi. Pastikan GPS/Lokasi diaktifkan.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ margin: '10px 0' }}>
      <button type="button" className="btn btn-secondary" onClick={handleGetLocation} disabled={loading}>
        {loading ? '🔍 Mendeteksi Lokasi...' : '📍 Gunakan Lokasi Saya Sekarang'}
      </button>
      {location && (
        <div style={{ marginTop: 8, fontSize: '0.9rem', color: '#333' }}>
          <p><strong>Koordinat:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
          <p><strong>Alamat:</strong> {address}</p>
        </div>
      )}
    </div>
  );
};

export default GetMyLocation;