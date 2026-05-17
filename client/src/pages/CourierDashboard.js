import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FiPackage, FiClock, FiCheckCircle, FiMapPin, FiPhone, FiCamera, FiTruck,
  FiInfo, FiZap
} from 'react-icons/fi';



const formatWA = (phone) => {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) return clean;
  return clean.startsWith('0') ? '62' + clean.slice(1) : '62' + clean;
};

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



const useCountdown = (order) => {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!order || order.status === 'selesai' || order.status === 'batal') { setRemaining(''); return; }
    if (!order.estimated_days && !order.estimated_hours) { setRemaining('-'); return; }

    const calc = () => {
      const start = order.estimated_start
        ? new Date(order.estimated_start)
        : new Date(order.created_at);
      const ms = ((order.estimated_days || 0) * 86400 + (order.estimated_hours || 0) * 3600) * 1000;
      const deadline = new Date(start.getTime() + ms);
      const diff = deadline - Date.now();
      if (diff <= 0) return 'Selesai';
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) return `${Math.ceil(h / 24)} hari lagi`;
      return `${h}j ${m}m lagi`;
    };

    setRemaining(calc());
    const t = setInterval(() => setRemaining(calc()), 60000);
    return () => clearInterval(t);
  }, [order]);

  return remaining;
};

const CountdownBadge = ({ order }) => {
  const countdown = useCountdown(order);
  if (!countdown || countdown === '-') return null;
  const isSelesai = countdown === 'Selesai';
  return (
    <span style={{ 
      fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, 
      background: isSelesai ? '#dcfce7' : '#fee2e2', 
      color: isSelesai ? '#16a34a' : '#ef4444', 
      fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      <FiClock /> {countdown}
    </span>
  );
};

const getRemainingMs = (order) => {
  if (order.status === 'selesai' || order.status === 'batal') return Infinity;
  if (!order.estimated_days && !order.estimated_hours) return Infinity;

  const start = order.estimated_start
    ? new Date(order.estimated_start)
    : new Date(order.created_at);
  const ms = ((order.estimated_days || 0) * 86400 + (order.estimated_hours || 0) * 3600) * 1000;
  const deadline = start.getTime() + ms;
  return deadline - Date.now();
};

const CourierDashboard = () => {
  const [orders, setOrders] = useState([]);

  const [detailModal, setDetailModal] = useState(null);
  const [pickupModal, setPickupModal] = useState(null);
  const [pickupPhoto, setPickupPhoto] = useState(null);
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchActiveOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchActiveOrders = async () => {
    try {
      const res = await axios.get('/api/courier/orders', { headers: h });
      setOrders(res.data);
    } catch (err) {
      console.error('Gagal ambil order:', err);
    }
  };



  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/courier/orders/${orderId}/status`, { status: newStatus }, { headers: h });
      fetchActiveOrders();
    } catch (err) {
      alert('Gagal mengubah status: ' + (err.response?.data?.message || err.message));
    }
  };

  const submitPickupPhoto = async () => {
    if (!pickupModal) return;
    if (!pickupPhoto) {
      alert('Foto wajib diupload');
      return;
    }
    const fd = new FormData();
    fd.append('photo', pickupPhoto);
    try {
      await axios.post(`/api/courier/orders/${pickupModal.id}/pickup-photo`, fd, {
        headers: { ...h, 'Content-Type': 'multipart/form-data' }
      });
      alert('Foto jemputan berhasil diupload');
      setPickupModal(null);
      setPickupPhoto(null);
      fetchActiveOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim foto');
    }
  };

  const openDelivery = (order) => {
    setDeliveryModal(order);
    setDeliveryPhoto(null);
    setDeliverySuccess(false);
  };

  const submitDelivery = async () => {
    if (!deliveryModal) return;
    if (!deliveryPhoto) {
      alert('Foto bukti pengantaran wajib diupload terlebih dahulu');
      return;
    }
    const fd = new FormData();
    fd.append('photo', deliveryPhoto);
    try {
      await axios.post(`/api/courier/orders/${deliveryModal.id}/deliver`, fd, {
        headers: { ...h, 'Content-Type': 'multipart/form-data' }
      });
      setDeliverySuccess(true);
      fetchActiveOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim bukti');
    }
  };

  const openDetail = (order) => setDetailModal(order);


  return (
    <div className="admin-dashboard-clean">
      {/* Header */}
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Dashboard Kurir</h2>
          <p>Order yang harus diantar & dijemput</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courier/history')}>
          <FiClock /> Riwayat
        </button>
      </div>

      {/* Sections List */}
      <div className="courier-sections-container" style={{ display: 'grid', gap: 30 }}>
        
        {/* SECTION: PENJEMPUTAN */}
        <section className="courier-section">
          <div className="section-header-clean" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="section-icon-bg" style={{ background: 'var(--sky-pale)', color: 'var(--blue)', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FiTruck />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>Penjemputan Laundry</h3>
            <span style={{ marginLeft: 'auto', background: 'var(--navy)', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
              {orders.filter(o => o.status === 'pickup' || o.status === 'menunggu').length} Pesanan
            </span>
          </div>

          <div className="admin-table-card desktop-only">
            <div className="table-responsive">
              <table className="admin-order-table">
                <thead>
                  <tr><th>Order</th><th>Pelanggan</th><th>Alamat</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {orders.filter(o => o.status === 'pickup' || o.status === 'menunggu').length === 0 ? (
                    <tr><td colSpan="4" className="empty-cell">Tidak ada jemputan saat ini</td></tr>
                  ) : (
                    orders.filter(o => o.status === 'pickup' || o.status === 'menunggu').map(order => (
                      <tr key={order.id}>
                        <td><div className="order-code">{order.order_code}</div></td>
                        <td><div className="customer-name">{order.customer_name}</div><div className="customer-phone">{order.customer_phone}</div></td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.8rem' }}><FiMapPin size={12} /> {order.address}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-detail" onClick={() => openDetail(order)}><FiInfo /> Detail</button>
                            <button 
                              className="btn btn-sm" 
                              style={{ background: '#10b981', color: 'white', padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => { if (window.confirm('Yakin pesanan sudah dijemput?')) updateStatus(order.id, 'cuci'); }}
                            >
                              <FiCheckCircle /> Sudah Dijemput
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mobile-order-list mobile-only">
            {orders.filter(o => o.status === 'pickup' || o.status === 'menunggu').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-4)', background: 'white', borderRadius: 12, border: '1px dashed var(--border)' }}>Tidak ada jemputan</div>
            ) : orders.filter(o => o.status === 'pickup' || o.status === 'menunggu').map(order => (
              <div key={order.id} className="mobile-order-card" style={{ position: 'relative', overflow: 'hidden' }}>
                {order.photo_url && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '36px solid #10b981', borderLeft: '36px solid transparent', zIndex: 1 }} title="Ada Foto Barang">
                    <FiCamera style={{ position: 'absolute', top: -32, right: 2, color: 'white', fontSize: '0.8rem', zIndex: 2 }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div className="order-code">{order.order_code}</div>
                    <div className="customer-name">{order.customer_name}</div>
                  </div>
                  <span className={`service-badge ${order.service_speed}`} style={{ fontSize: '0.72rem' }}>
                    {order.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(order)}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 12 }}><FiMapPin /> {order.address}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-detail" onClick={() => openDetail(order)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><FiInfo /> Detail</button>
                  <button className="btn" style={{ flex: 1.5, background: '#10b981', color: 'white', justifyContent: 'center', alignItems: 'center' }} onClick={() => { if (window.confirm('Yakin pesanan sudah dijemput?')) updateStatus(order.id, 'cuci'); }}><FiCheckCircle /> Dijemput</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION: PENGIRIMAN */}
        <section className="courier-section">
          <div className="section-header-clean" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="section-icon-bg" style={{ background: '#D1FAE5', color: '#065F46', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FiPackage />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>Pengiriman Laundry</h3>
            <span style={{ marginLeft: 'auto', background: '#065F46', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
              {orders.filter(o => o.status === 'antar' || o.status === 'cuci').length} Pesanan
            </span>
          </div>

          <div className="admin-table-card desktop-only">
            <div className="table-responsive">
              <table className="admin-order-table">
                <thead>
                  <tr><th>Order</th><th>Pelanggan</th><th>Alamat</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {orders.filter(o => o.status === 'antar' || o.status === 'cuci').length === 0 ? (
                    <tr><td colSpan="4" className="empty-cell">Tidak ada pengiriman saat ini</td></tr>
                  ) : (
                    orders.filter(o => o.status === 'antar' || o.status === 'cuci')
                      .sort((a, b) => getRemainingMs(a) - getRemainingMs(b))
                      .map(order => (
                      <tr key={order.id}>
                        <td>
                          <div className="order-code">{order.order_code}</div>
                          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: order.status === 'antar' ? '#d1fae5' : '#fee2e2', color: order.status === 'antar' ? '#065f46' : '#991b1b', fontWeight: 600 }}>
                              {order.status === 'antar' ? 'Siap Antar' : 'Proses Cuci'}
                            </span>
                            <CountdownBadge order={order} />
                          </div>
                        </td>
                        <td><div className="customer-name">{order.customer_name}</div><div className="customer-phone">{order.customer_phone}</div></td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.8rem' }}><FiMapPin size={12} /> {order.address}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-detail" onClick={() => openDetail(order)}><FiInfo /> Detail</button>
                            {order.status === 'antar' ? (
                              <button 
                                className="btn btn-sm" 
                                style={{ background: '#10b981', color: 'white', padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => openDelivery(order)}
                              >
                                <FiCheckCircle /> Selesaikan & Upload Foto
                              </button>
                            ) : (
                              <button className="btn btn-sm" disabled style={{ background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', padding: '4px 10px', fontSize: '0.75rem' }}>
                                Menunggu Admin
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mobile-order-list mobile-only">
            {orders.filter(o => o.status === 'antar' || o.status === 'cuci').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-4)', background: 'white', borderRadius: 12, border: '1px dashed var(--border)' }}>Tidak ada pengiriman</div>
            ) : orders.filter(o => o.status === 'antar' || o.status === 'cuci')
                .sort((a, b) => getRemainingMs(a) - getRemainingMs(b))
                .map(order => (
              <div key={order.id} className="mobile-order-card" style={{ position: 'relative', overflow: 'hidden' }}>
                {order.photo_url && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '36px solid #10b981', borderLeft: '36px solid transparent', zIndex: 1 }} title="Ada Foto Barang">
                    <FiCamera style={{ position: 'absolute', top: -32, right: 2, color: 'white', fontSize: '0.8rem', zIndex: 2 }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div className="order-code">{order.order_code}</div>
                    <div className="customer-name">{order.customer_name}</div>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: order.status === 'antar' ? '#d1fae5' : '#fee2e2', color: order.status === 'antar' ? '#065f46' : '#991b1b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {order.status === 'antar' ? <><FiCheckCircle /> SIAP ANTAR</> : <><FiClock /> PROSES CUCI</>}
                      </span>
                      <CountdownBadge order={order} />
                    </div>
                  </div>
                  <span className={`service-badge ${order.service_speed}`} style={{ fontSize: '0.72rem' }}>
                    {order.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(order)}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 12 }}><FiMapPin /> {order.address}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-detail" onClick={() => openDetail(order)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><FiInfo /> Detail</button>
                  {order.status === 'antar' ? (
                    <button 
                      className="btn" 
                      style={{ flex: 1.5, background: '#10b981', color: 'white', justifyContent: 'center', alignItems: 'center' }}
                      onClick={() => openDelivery(order)}
                    >
                      <FiCheckCircle /> Selesaikan
                    </button>
                  ) : (
                    <button className="btn" disabled style={{ flex: 1.5, background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', justifyContent: 'center', alignItems: 'center' }}>
                      Menunggu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL DETAIL */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3>Detail Order <span style={{ fontWeight: 400, color: '#64748b' }}>{detailModal.order_code}</span></h3>
              <button className="btn-close" onClick={() => setDetailModal(null)}>×</button>
            </div>

            <div className="detail-section">
              <h4>Informasi Pelanggan</h4>
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Nama</div><div className="detail-value">{detailModal.customer_name}</div></div>
                <div className="detail-item"><div className="detail-label">Telepon</div><div className="detail-value">{detailModal.customer_phone || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Alamat</div><div className="detail-value">{detailModal.address}</div></div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}><div className="detail-label">Catatan untuk Kurir</div><div className="detail-value" style={{ color: 'var(--blue)', fontWeight: 600 }}>{detailModal.courier_notes || detailModal.notes || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Layanan</div><div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{detailModal.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(detailModal)}</div></div>
              </div>
              {detailModal.address && (
                <div className="detail-actions" style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailModal.address)}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary"><FiMapPin /> Google Maps</a>
                  {detailModal.customer_phone && (
                    <a href={`https://wa.me/${formatWA(detailModal.customer_phone)}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25D366', color: 'white' }}><FiPhone /> WhatsApp</a>
                  )}
                </div>
              )}
            </div>

            {detailModal.photo_url && (
              <div className="detail-section">
                <h4>Foto Barang (Tas)</h4>
                <div style={{ background: '#f8faff', padding: 12, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <img 
                    src={resolveFileUrl(detailModal.photo_url)} 
                    alt="Foto Barang" 
                    style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, display: 'block', margin: '0 auto' }} 
                  />
                  <p style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-4)' }}>Foto diambil saat order dibuat</p>
                </div>
              </div>
            )}

            <div className="detail-actions" style={{ marginTop: 20, display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)} style={{ flex: 1 }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD BUKTI PENGANTARAN */}
      {deliveryModal && (
        <div className="modal-overlay" onClick={() => setDeliveryModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            {!deliverySuccess ? (
              <>
                <h3>📸 Upload Bukti Pengantaran</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 12 }}>{deliveryModal.order_code} — {deliveryModal.customer_name}</p>
                <div style={{ border: '2px dashed #c7d2fe', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16, background: '#f8faff' }}>
                  <FiCamera style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: 6 }} />
                  <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 8 }}>Foto wajib diupload untuk menyelesaikan pesanan</p>
                  <input type="file" accept="image/*" onChange={e => setDeliveryPhoto(e.target.files[0])} />
                  {deliveryPhoto && <p style={{ marginTop: 8, color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><FiCheckCircle /> {deliveryPhoto.name}</p>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setDeliveryModal(null)}>Batal</button>
                  <button className="btn" onClick={submitDelivery} disabled={!deliveryPhoto}>
                    <FiCheckCircle /> Kirim & Selesaikan
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FiCheckCircle /> Pesanan sudah diantarkan</h3>
                <button className="btn" onClick={() => setDeliveryModal(null)}>Tutup</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL UPLOAD FOTO PENJEMPUTAN */}
      {pickupModal && (
        <div className="modal-overlay" onClick={() => setPickupModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>📸 Foto Penjemputan</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 12 }}>{pickupModal.order_code} — {pickupModal.customer_name}</p>
            <div style={{ border: '2px dashed #c7d2fe', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16, background: '#f8faff' }}>
              <FiCamera style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: 6 }} />
              <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 8 }}>Ambil foto barang saat penjemputan</p>
              <input type="file" accept="image/*" onChange={e => setPickupPhoto(e.target.files[0])} />
              {pickupPhoto && <p style={{ marginTop: 8, color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><FiCheckCircle /> {pickupPhoto.name}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPickupModal(null)}>Batal</button>
              <button className="btn" onClick={submitPickupPhoto} disabled={!pickupPhoto} style={{ background: 'var(--navy)', color: 'white' }}>
                <FiCheckCircle /> Simpan Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierDashboard;