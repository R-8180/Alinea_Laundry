import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiPackage, FiClock, FiCheckCircle, FiMapPin, FiCamera, FiFileText, FiTruck,
  FiInfo, FiChevronDown, FiZap
} from 'react-icons/fi';

const categoryLabels = { cuci_setrika: 'Cuci Setrika', cuci_lipat: 'Cuci Lipat', satuan: 'Satuan' };

const resolveFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  let base = process.env.REACT_APP_API_URL || '';
  if (!base && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    base = 'http://localhost:5000';
  }
  return `${base}${url}`;
};

const formatServiceLabel = (order) => {
  const cat = categoryLabels[order.service_category] || order.service_name || '';
  const speed = order.service_speed === 'express' ? 'Express' : 'Reguler';
  let duration = '';
  if (order.service_time_days > 0) duration = `${order.service_time_days} Hari`;
  else if (order.service_time_hours > 0) duration = `${order.service_time_hours} Jam`;
  return [cat, speed, duration].filter(Boolean).join(' · ');
};

const statusLabels = {
  menunggu: 'Menunggu',
  pickup: 'Dijemput',
  cuci: 'Dicuci',
  antar: 'Diantar',
  selesai: 'Selesai'
};


const AccordionItem = ({ icon, label, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="accordion-card">
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <span className="accordion-title"><span style={{ marginRight: 8 }}>{icon}</span>{label}</span>
        <FiChevronDown className={`accordion-chevron ${open ? 'open' : ''}`} />
      </div>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
};

const CourierHistory = () => {
  const [history, setHistory] = useState([]);
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/courier/history', { headers: h });
      setHistory(res.data);
    } catch (err) {
      console.error('Gagal ambil riwayat:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (order) => setDetailModal(order);

  return (
    <div className="admin-dashboard-clean">
      {/* Header */}
      <div className="admin-header">
        <h2>Riwayat Pengantaran</h2>
        <p>Daftar pesanan yang telah selesai Anda tangani</p>
      </div>

      {/* History List */}
      <div className="courier-history-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}><FiClock style={{ marginRight: 8 }} />Memuat riwayat...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}>
            <FiCheckCircle style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 12 }} />
            <div>Belum ada riwayat pengantaran</div>
          </div>
        ) : history.map(order => (
          <div key={order.id} className="mobile-order-card" style={{ opacity: 0.9, position: 'relative', overflow: 'hidden' }}>
            {order.photo_url && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '36px solid #10b981', borderLeft: '36px solid transparent', zIndex: 1 }} title="Ada Foto Barang">
                <FiCamera style={{ position: 'absolute', top: -32, right: 2, color: 'white', fontSize: '0.8rem', zIndex: 2 }} />
              </div>
            )}
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div className="order-code">{order.order_code}</div>
                <div className="customer-name">{order.customer_name}</div>
                {order.customer_phone && <div className="customer-phone">{order.customer_phone}</div>}
              </div>
              <span className={`status-badge status-${order.status}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>

            {/* Meta badges */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className={`service-badge ${order.service_speed}`}>
                {order.service_speed === 'express' ? <FiZap style={{ marginRight: 4 }} /> : <FiPackage style={{ marginRight: 4 }} />}
                {formatServiceLabel(order)}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', alignSelf: 'center' }}>
                {order.service_types || [...new Set(order.items?.map(i => i.service_type) || [])].join(', ') || 'Kiloan'}
              </span>
            </div>

            {/* Info rows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-3)' }}><FiMapPin /> Alamat</span>
              <span style={{ textAlign: 'right', maxWidth: '60%' }}>{order.customer_address}</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button className="btn-detail" onClick={() => openDetail(order)} style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }}>
                <FiInfo /> Detail Lengkap
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETAIL */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3>Detail Riwayat <span style={{ fontWeight: 400, color: '#64748b' }}>{detailModal.order_code}</span></h3>
              <button className="btn-close" onClick={() => setDetailModal(null)}>×</button>
            </div>

            <div className="detail-section">
              <h4>Informasi Pelanggan</h4>
               <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Nama</div><div className="detail-value">{detailModal.customer_name}</div></div>
                <div className="detail-item"><div className="detail-label">Telepon</div><div className="detail-value">{detailModal.customer_phone || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Alamat</div><div className="detail-value">{detailModal.customer_address}</div></div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}><div className="detail-label">Catatan untuk Kurir</div><div className="detail-value" style={{ color: 'var(--blue)', fontWeight: 600 }}>{detailModal.courier_notes || detailModal.notes || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Layanan</div><div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{detailModal.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(detailModal)}</div></div>
              </div>
              {detailModal.customer_address && (
                <div className="detail-actions" style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailModal.customer_address)}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary"><FiMapPin /> Google Maps</a>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>Dokumentasi</h4>
              {[
                { label: 'Foto Barang', key: 'photo_url', icon: <FiCamera /> },
                { label: 'Bukti Pembayaran', key: 'payment_proof', icon: <FiFileText /> },
                { label: 'Foto Serah Terima', key: 'delivery_proof', icon: <FiTruck /> }
              ].map(item => (
                <AccordionItem key={item.key} icon={item.icon} label={item.label}>
                  {detailModal[item.key] ? (
                    <img src={resolveFileUrl(detailModal[item.key])} alt={item.label} style={{ maxWidth: '100%', borderRadius: 12 }} />
                  ) : (
                    <p style={{ color: '#888' }}>Belum tersedia</p>
                  )}
                </AccordionItem>
              ))}
            </div>

            <button className="btn" onClick={() => setDetailModal(null)} style={{ width: '100%', marginTop: 20 }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierHistory;