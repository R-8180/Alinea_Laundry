import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FiMapPin } from 'react-icons/fi';
import { showError, showWarning } from '../utils/swal';

// Perbaiki ikon default
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
};

const MapPicker = ({ onLocationSelect }) => {
  const [position, setPosition] = useState(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showWarning('Geo tidak Didukung', 'Fitur geolocation tidak didukung oleh browser Anda.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        if (onLocationSelect) onLocationSelect(lat, lng);
      },
      (err) => showError('Gagal Lokasi', 'Gagal mendapatkan koordinat lokasi. Pastikan GPS aktif.'),
      { enableHighAccuracy: true }
    );
  };

  const handlePositionChange = (newPos) => {
    setPosition(newPos);
    if (onLocationSelect) onLocationSelect(newPos[0], newPos[1]);
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ height: '250px', borderRadius: '12px', overflow: 'hidden' }}>
        <MapContainer
          center={position || [-6.9819, 110.4097]} // Semarang
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={handlePositionChange} />
        </MapContainer>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={handleGetLocation}
        style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <FiMapPin /> Gunakan Lokasi Saya
      </button>
    </div>
  );
};

export default MapPicker;