import React, { useState, useEffect } from 'react';
import PhotoUploader from '../components/PhotoUploader';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/swal';
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

const getDynamicWAMessage = (order) => {
  const name = order.customer_name || 'Pelanggan';
  const code = order.order_code;
  const status = order.status;
  const payStatus = order.payment_status;
  const total = order.total_price ? Math.round(order.total_price).toLocaleString('id-ID') : '0';

  if (payStatus === 'unpaid' && order.total_price > 0) {
    return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* telah selesai ditimbang dan divalidasi oleh admin. Total tagihan Anda adalah *Rp ${total}*. Mohon kesediaannya untuk melakukan pembayaran via QRIS dan mengunggah bukti bayarnya di dasbor pelanggan ya Kak. Terima kasih banyak!`;
  }

  switch (status) {
    case 'menunggu':
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* saat ini berstatus *Menunggu Penjemputan*. Kurir kami akan segera meluncur ke lokasi Kakak untuk mengambil pakaian kotor. Mohon ditunggu ya Kak. Terima kasih!`;
    case 'pickup':
      return `Halo Kak ${name}, kurir kami saat ini *sedang dalam perjalanan* menjemput atau *sudah berada di lokasi* untuk pesanan laundry *${code}* Anda. Mohon siapkan pakaian kotor yang akan diserahkan ya Kak. Terima kasih banyak!`;
    case 'proses':
      return `Halo Kak ${name}, kami menginformasikan bahwa pesanan laundry Anda dengan kode *${code}* saat ini sudah berada di cabang laundry dan sedang dalam *proses pencucian/pengerjaan* higienis oleh tim kami. Kami akan memberi kabar kembali jika sudah selesai. Terima kasih ya Kak!`;
    case 'antar':
      return `Halo Kak ${name}, kabar baik! Pakaian bersih Anda untuk pesanan *${code}* saat ini sudah siap diantarkan dan masuk antrean pengantaran. Kurir kami segera mengantarkannya kembali ke lokasi Kakak. Terima kasih!`;
    case 'sedang_diantar':
      return `Halo Kak ${name}, kurir kami saat ini *sedang dalam perjalanan* mengantarkan pakaian bersih Anda untuk pesanan *${code}*. Mohon bersiap untuk menerima laundry wangi Anda ya Kak. Terima kasih banyak!`;
    case 'selesai':
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* telah dinyatakan *Selesai dan Diterima* dengan baik. Terima kasih banyak telah mempercayakan laundry Anda kepada Alinea Laundry! Semoga Kakak puas dengan layanan kami.`;
    case 'batal':
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* telah *Dibatalkan*. Jika Kakak membutuhkan bantuan atau ada kekeliruan, silakan hubungi admin kami. Terima kasih.`;
    default:
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* sedang kami proses. Terima kasih!`;
  }
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
  const [helpModal, setHelpModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'bantuan') {
      setHelpModal(true);
    } else {
      setHelpModal(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchActiveOrders();
    fetchHelpContacts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHelpContacts = async () => {
    try {
      const res = await axios.get('/api/courier/bantuan-directory', { headers: h });
      setContacts(res.data);
    } catch (err) {
      console.error('Gagal ambil kontak bantuan:', err);
    }
  };

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
      showError('Gagal Ubah Status', err.response?.data?.message || err.message || 'Gagal memperbarui status order');
    }
  };

  const submitPickupPhoto = async () => {
    if (!pickupModal) return;
    if (!pickupPhoto) {
      showWarning('Foto Wajib', 'Silakan ambil/pilih foto barang terlebih dahulu');
      return;
    }
    const fd = new FormData();
    fd.append('photo', pickupPhoto);
    try {
      await axios.post(`/api/courier/orders/${pickupModal.id}/pickup-photo`, fd, {
        headers: { ...h, 'Content-Type': 'multipart/form-data' }
      });
      showSuccess('Sukses Jemput', 'Foto barang berhasil diunggah!');
      setPickupModal(null);
      setPickupPhoto(null);
      fetchActiveOrders();
    } catch (err) {
      showError('Gagal Upload', err.response?.data?.message || 'Gagal mengunggah foto');
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
      showWarning('Foto Bukti Wajib', 'Silakan ambil/pilih foto bukti pengantaran terlebih dahulu');
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
      showError('Gagal Menyelesaikan', err.response?.data?.message || 'Gagal mengunggah bukti pengantaran');
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
                            <select
                              value={order.status}
                              onChange={async (e) => {
                                const nextStatus = e.target.value;
                                if (nextStatus === 'proses') {
                                  const confirmRes = await showConfirm('Konfirmasi Jemput', 'Apakah Anda yakin pesanan laundry ini sudah dijemput?');
                                  if (confirmRes.isConfirmed) updateStatus(order.id, 'proses');
                                } else {
                                  updateStatus(order.id, nextStatus);
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: 'var(--navy)',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                outline: 'none',
                                boxShadow: 'var(--sh-sm)'
                              }}
                            >
                              <option value="menunggu">Menunggu Dijemput</option>
                              <option value="pickup">Sedang Dijemput</option>
                              <option value="proses">Sudah Dijemput</option>
                            </select>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="order-code" style={{ marginBottom: 0 }}>{order.order_code}</span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--slate-100)', color: 'var(--navy)', borderRadius: 4, fontWeight: 700 }}>Cabang {order.branch_name || 'Utama'}</span>
                    </div>
                    <div className="customer-name">{order.customer_name}</div>
                  </div>
                  <span className={`service-badge ${order.service_speed}`} style={{ fontSize: '0.72rem' }}>
                    {order.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(order)}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 12 }}><FiMapPin /> {order.address}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-detail" onClick={() => openDetail(order)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><FiInfo /> Detail</button>
                  <select
                    value={order.status}
                    onChange={async (e) => {
                      const nextStatus = e.target.value;
                      if (nextStatus === 'proses') {
                        const confirmRes = await showConfirm('Konfirmasi Jemput', 'Apakah Anda yakin pesanan laundry ini sudah dijemput?');
                        if (confirmRes.isConfirmed) updateStatus(order.id, 'proses');
                      } else {
                        updateStatus(order.id, nextStatus);
                      }
                    }}
                    style={{
                      flex: 1.5,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--navy)',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: 'var(--sh-sm)'
                    }}
                  >
                    <option value="menunggu">Menunggu Dijemput</option>
                    <option value="pickup">Sedang Dijemput</option>
                    <option value="proses">Sudah Dijemput</option>
                  </select>
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>Pengiriman Laundry</h3>            <span style={{ marginLeft: 'auto', background: '#065F46', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
              {orders.filter(o => o.status === 'antar' || o.status === 'proses' || o.status === 'sedang_diantar').length} Pesanan
            </span>
          </div>
 
          <div className="admin-table-card desktop-only">
            <div className="table-responsive">
              <table className="admin-order-table">
                <thead>
                  <tr><th>Order</th><th>Pelanggan</th><th>Alamat</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {orders.filter(o => o.status === 'antar' || o.status === 'proses' || o.status === 'sedang_diantar').length === 0 ? (
                    <tr><td colSpan="4" className="empty-cell">Tidak ada pengiriman saat ini</td></tr>
                  ) : (
                    orders.filter(o => o.status === 'antar' || o.status === 'proses' || o.status === 'sedang_diantar')
                      .sort((a, b) => getRemainingMs(a) - getRemainingMs(b))
                      .map(order => (
                      <tr key={order.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="order-code">{order.order_code}</div>
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--slate-100)', color: 'var(--navy)', borderRadius: 4, fontWeight: 700 }}>Cabang {order.branch_name || 'Utama'}</span>
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <span style={{ 
                              fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, 
                              background: order.status === 'sedang_diantar' ? '#dbeafe' : (order.status === 'antar' ? '#d1fae5' : '#fee2e2'), 
                              color: order.status === 'sedang_diantar' ? '#1e40af' : (order.status === 'antar' ? '#065f46' : '#991b1b'), 
                              fontWeight: 600 
                            }}>
                              {order.status === 'sedang_diantar' ? 'Sedang Diantar' : (order.status === 'antar' ? 'Siap Antar' : 'Proses Cuci')}
                            </span>
                            <CountdownBadge order={order} />
                          </div>
                        </td>
                        <td><div className="customer-name">{order.customer_name}</div><div className="customer-phone">{order.customer_phone}</div></td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.8rem' }}><FiMapPin size={12} /> {order.address}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-detail" onClick={() => openDetail(order)}><FiInfo /> Detail</button>
                            {order.status === 'proses' ? (
                              <select disabled style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#94a3b8',
                                background: '#f1f5f9',
                                cursor: 'not-allowed',
                                outline: 'none'
                              }} value="proses">
                                <option value="proses">Proses Cuci</option>
                              </select>
                            ) : (
                              <select
                                value={order.status}
                                onChange={async (e) => {
                                  const nextStatus = e.target.value;
                                  if (nextStatus === 'selesai') {
                                    openDelivery(order);
                                  } else {
                                    updateStatus(order.id, nextStatus);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border)',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: 'var(--navy)',
                                  background: '#f8fafc',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  boxShadow: 'var(--sh-sm)'
                                }}
                              >
                                <option value="antar">Menunggu Diantar</option>
                                <option value="sedang_diantar">Sedang Diantar</option>
                                <option value="selesai">Selesai (Kirim Bukti)</option>
                              </select>
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
            {orders.filter(o => o.status === 'antar' || o.status === 'proses' || o.status === 'sedang_diantar').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-4)', background: 'white', borderRadius: 12, border: '1px dashed var(--border)' }}>Tidak ada pengiriman</div>
            ) : orders.filter(o => o.status === 'antar' || o.status === 'proses' || o.status === 'sedang_diantar')
                .sort((a, b) => getRemainingMs(a) - getRemainingMs(b))
                .map(order => (
              <div key={order.id} className="mobile-order-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="order-code" style={{ marginBottom: 0 }}>{order.order_code}</span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--slate-100)', color: 'var(--navy)', borderRadius: 4, fontWeight: 700 }}>Cabang {order.branch_name || 'Utama'}</span>
                    </div>
                    <div className="customer-name">{order.customer_name}</div>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, 
                        background: order.status === 'sedang_diantar' ? '#dbeafe' : (order.status === 'antar' ? '#d1fae5' : '#fee2e2'), 
                        color: order.status === 'sedang_diantar' ? '#1e40af' : (order.status === 'antar' ? '#065f46' : '#991b1b'), 
                        fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 
                      }}>
                        {order.status === 'sedang_diantar' ? <><FiTruck /> DIANTAR</> : (order.status === 'antar' ? <><FiCheckCircle /> SIAP ANTAR</> : <><FiClock /> PROSES CUCI</>)}
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
                  {order.status === 'proses' ? (
                    <select disabled style={{
                      flex: 1.5,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#94a3b8',
                      background: '#f1f5f9',
                      cursor: 'not-allowed',
                      outline: 'none'
                    }} value="proses">
                      <option value="proses">Proses Cuci</option>
                    </select>
                  ) : (
                    <select
                      value={order.status}
                      onChange={async (e) => {
                        const nextStatus = e.target.value;
                        if (nextStatus === 'selesai') {
                          openDelivery(order);
                        } else {
                          updateStatus(order.id, nextStatus);
                        }
                      }}
                      style={{
                        flex: 1.5,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--navy)',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: 'var(--sh-sm)'
                      }}
                    >
                      <option value="antar">Menunggu Diantar</option>
                      <option value="sedang_diantar">Sedang Diantar</option>
                      <option value="selesai">Selesai (Kirim Bukti)</option>
                    </select>
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
                {detailModal.branch_name && (
                  <div className="detail-item"><div className="detail-label">Cabang</div><div className="detail-value" style={{ fontWeight: 600, color: 'var(--blue)' }}><FiMapPin style={{ marginRight: '4px' }} /> {detailModal.branch_name}</div></div>
                )}
                <div className="detail-item"><div className="detail-label">Telepon</div><div className="detail-value">{detailModal.customer_phone || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Alamat</div><div className="detail-value">{detailModal.address}</div></div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}><div className="detail-label">Catatan untuk Kurir</div><div className="detail-value" style={{ color: 'var(--blue)', fontWeight: 600 }}>{detailModal.courier_notes || detailModal.notes || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Layanan</div><div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{detailModal.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(detailModal)}</div></div>
              </div>
              {detailModal.address && (
                <div className="detail-actions" style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailModal.address)}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary"><FiMapPin /> Google Maps</a>
                  {detailModal.customer_phone && (
                    <a href={`https://wa.me/${formatWA(detailModal.customer_phone)}?text=${encodeURIComponent(getDynamicWAMessage(detailModal))}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25D366', color: 'white' }}><FiPhone /> WhatsApp</a>
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
                <h3><FiCamera className="icon-inline" /> Upload Bukti Pengantaran</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 12 }}>{deliveryModal.order_code} — {deliveryModal.customer_name}</p>
                <div style={{ border: '2px dashed #c7d2fe', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16, background: '#f8faff' }}>
                  <PhotoUploader
                    photo={deliveryPhoto}
                    onPhoto={setDeliveryPhoto}
                    required
                  />
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
            <h3><FiCamera className="icon-inline" /> Foto Penjemputan</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 12 }}>{pickupModal.order_code} — {pickupModal.customer_name}</p>
            <div style={{ border: '2px dashed #c7d2fe', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16, background: '#f8faff' }}>
              <PhotoUploader
                photo={pickupPhoto}
                onPhoto={setPickupPhoto}
                required
              />
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

      {/* MODAL BANTUAN KONTAK */}
      {helpModal && (
        <div className="modal-overlay" onClick={() => { setHelpModal(false); navigate('/dashboard', { replace: true }); }}>
          <div className="modal-content modal-md" onClick={e => e.stopPropagation()} style={{ borderRadius: 16, padding: '24px', maxWidth: 500 }}>
            <div className="detail-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><FiInfo /> Pusat Kontak Bantuan</h3>
              <button className="btn-close" onClick={() => { setHelpModal(false); navigate('/dashboard', { replace: true }); }}>×</button>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: 20 }}>
              Hubungi Admin cabang atau Kurir lainnya untuk koordinasi operasional penjemputan dan pengantaran pakaian.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
              {/* ADMIN SAMPANGAN */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--blue)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 10, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Admin Sampangan (Cabang 1)
                </h4>
                {contacts.filter(c => c.role === 'admin' && c.branch_id === 1).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-4)' }}>Tidak ada admin aktif</div>
                ) : (
                  contacts.filter(c => c.role === 'admin' && c.branch_id === 1).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f3f8', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{c.phone || '-'}</div>
                      </div>
                      {c.phone && (
                        <a href={`https://wa.me/${formatWA(c.phone)}?text=${encodeURIComponent(`Halo Admin Sampangan ${c.name}, saya kurir ingin berkoordinasi mengenai order.`)}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25D366', color: 'white', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiPhone /> Chat
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* ADMIN UNNES */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--blue)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 10, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Admin Unnes (Cabang 2)
                </h4>
                {contacts.filter(c => c.role === 'admin' && c.branch_id === 2).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-4)' }}>Tidak ada admin aktif</div>
                ) : (
                  contacts.filter(c => c.role === 'admin' && c.branch_id === 2).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f3f8', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{c.phone || '-'}</div>
                      </div>
                      {c.phone && (
                        <a href={`https://wa.me/${formatWA(c.phone)}?text=${encodeURIComponent(`Halo Admin Unnes ${c.name}, saya kurir ingin berkoordinasi mengenai order.`)}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25D366', color: 'white', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiPhone /> Chat
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* ADMIN TLOGOSARI */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--blue)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 10, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Admin Tlogosari (Cabang 3)
                </h4>
                {contacts.filter(c => c.role === 'admin' && c.branch_id === 3).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-4)' }}>Tidak ada admin aktif</div>
                ) : (
                  contacts.filter(c => c.role === 'admin' && c.branch_id === 3).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f3f8', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{c.phone || '-'}</div>
                      </div>
                      {c.phone && (
                        <a href={`https://wa.me/${formatWA(c.phone)}?text=${encodeURIComponent(`Halo Admin Tlogosari ${c.name}, saya kurir ingin berkoordinasi mengenai order.`)}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25D366', color: 'white', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiPhone /> Chat
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* SEMUA KURIR */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--blue)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 10, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Rekan Kurir (Operasional)
                </h4>
                {contacts.filter(c => c.role === 'courier').length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-4)' }}>Tidak ada kurir lain</div>
                ) : (
                  contacts.filter(c => c.role === 'courier').map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f3f8', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>{c.phone || '-'}</div>
                      </div>
                      {c.phone && (
                        <a href={`https://wa.me/${formatWA(c.phone)}?text=${encodeURIComponent(`Halo Kurir ${c.name}, saya rekan kurir ingin berkoordinasi.`)}`} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25D366', color: 'white', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiPhone /> Chat
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierDashboard;