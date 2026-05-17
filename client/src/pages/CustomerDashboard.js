import React, { useState, useEffect } from 'react';
import FloatingWA from '../components/FloatingWA';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiClock, FiTruck, FiDroplet, FiPackage, FiCheckCircle,
  FiList, FiPlus, FiGift, FiHome, FiCopy, FiEye, FiDollarSign, FiXCircle, FiZap, FiCreditCard, FiCamera, FiDownload
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

/* ---------- COUNTDOWN HOOK ---------- */
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

const formatServiceLabel = (order) => {
  const cat = categoryLabels[order.service_category] || order.service_name || '';
  const speed = order.service_speed === 'express' ? 'Express' : 'Reguler';
  let duration = '';
  if (order.service_time_days > 0) duration = `${order.service_time_days} Hari`;
  else if (order.service_time_hours > 0) duration = `${order.service_time_hours} Jam`;
  return [cat, speed, duration].filter(Boolean).join(' · ');
};

const formatRupiah = (n) => 'Rp ' + Math.floor(Number(n) || 0).toLocaleString('id-ID');

const statusLabels = {
  menunggu: 'Menunggu',
  pickup: 'Dijemput',
  cuci: 'Dicuci',
  antar: 'Diantar',
  selesai: 'Selesai',
  batal: 'Dibatalkan',
};

const statusOrder = ['menunggu', 'pickup', 'cuci', 'antar', 'selesai'];

const stepIcons = {
  menunggu: <FiClock />,
  pickup: <FiTruck />,
  cuci: <FiDroplet />,
  antar: <FiPackage />,
  selesai: <FiCheckCircle />,
  batal: <FiXCircle />,
};

const getEstimatedDate = (order) => {
  if (!order.estimated_days && !order.estimated_hours) return null;
  const start = order.estimated_start ? new Date(order.estimated_start) : new Date(order.created_at);
  const durationMs = ((order.estimated_days || 0) * 24 * 60 * 60 * 1000) + ((order.estimated_hours || 0) * 60 * 60 * 1000);
  const deadline = new Date(start.getTime() + durationMs);
  return deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};


const CustomerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [paymentModal, setPaymentModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [voucherStatus, setVoucherStatus] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(); fetchVoucherStatus(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data);
    } catch {}
  };

  const fetchVoucherStatus = async () => {
    try {
      const res = await axios.get('/api/orders/voucher/status', { headers: { Authorization: `Bearer ${token}` } });
      setVoucherStatus(res.data);
    } catch {}
  };

  const openPaymentModal = async (orderId) => {
    const res = await axios.get(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
    setPaymentModal(res.data);
  };

  const openDetailModal = async (orderId) => {
    const res = await axios.get(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
    setDetailModal(res.data);
  };

  const copyOrderCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Kode order disalin!');
  };

  const uploadPayment = (orderId) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData(); fd.append('proof', file);
      try {
        await axios.post(`/api/payments/${orderId}/upload`, fd, { headers: { Authorization: `Bearer ${token}` } });
        alert('Bukti pembayaran berhasil diupload!'); 
        fetchOrders();
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Gagal mengupload bukti pembayaran');
      }
    };
    inp.click();
  };

  const completeOrder = async (orderId) => {
    if (!window.confirm('Yakin pesanan sudah diterima dan selesai?')) return;
    try {
      await axios.put(`/api/orders/${orderId}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('Pesanan selesai! Terima kasih 🎉');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyelesaikan pesanan');
    }
  };

  const claimVoucher = async () => {
    try {
      const res = await axios.post('/api/orders/voucher/claim', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message + ': ' + res.data.code);
      fetchVoucherStatus();
    } catch (err) { alert(err.response?.data?.message || 'Gagal klaim voucher'); }
  };

  const ongoing = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal');
  const formatDateTime = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

  const renderProgressBar = (order) => {
    const currentIdx = statusOrder.indexOf(order.status);
    const percent = ((currentIdx + 1) / statusOrder.length) * 100;
    return (
      <div className="progress-container">
        <div className="progress-steps">
          {statusOrder.map((step, idx) => (
            <div key={step} className={`progress-step ${idx <= currentIdx ? 'active' : ''} ${idx === currentIdx ? 'current' : ''}`}>
              <div className="progress-dot">{stepIcons[step]}</div>
              <span className="progress-label">{statusLabels[step]}</span>
            </div>
          ))}
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  const OrderCard = ({ order }) => {
    const remaining = useCountdown(order);
    return (
      <div key={order.id} className="card order-card" style={{ padding: '20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        {order.photo_url && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '36px solid #10b981', borderLeft: '36px solid transparent', zIndex: 1 }} title="Ada Foto Barang">
            <FiCamera style={{ position: 'absolute', top: -32, right: 2, color: 'white', fontSize: '0.8rem', zIndex: 2 }} />
          </div>
        )}
        <div className="order-header" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ 
                background: 'var(--sky-pale)', 
                color: 'var(--blue)', 
                padding: '4px 10px', 
                borderRadius: '8px', 
                fontSize: '0.82rem', 
                fontWeight: 800,
                letterSpacing: '0.5px',
                border: '1px solid var(--sky)'
              }}>
                {order.order_code}
              </span>
              <button 
                onClick={() => copyOrderCode(order.order_code)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: '6px', 
                  cursor: 'pointer',
                  color: 'var(--text-4)',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                className="copy-btn-hover"
                title="Salin Kode"
              >
                <FiCopy size={14} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {formatDateTime(order.created_at)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          <span className={`status-badge status-${order.status}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {stepIcons[order.status]} {statusLabels[order.status]}
          </span>
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 20, padding: '4px 12px', border: '1px solid var(--border)', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {order.service_speed === 'express' ? <FiZap /> : <FiPackage />}
              {formatServiceLabel(order)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              {order.service_types || [...new Set(order.items?.map(i => i.service_type) || [])].join(', ') || 'Kiloan'}
            </span>
          </div>
        </div>

        {renderProgressBar(order)}

        {(order.estimated_days > 0 || order.estimated_hours > 0) && (
          <div style={{ 
            marginTop: 20, padding: '12px 16px', 
            background: 'var(--sky-pale)', borderRadius: 12, 
            display: 'flex', alignItems: 'center', gap: 10, 
            fontSize: '0.85rem', color: 'var(--navy)', 
            border: '1px solid var(--sky)'
          }}>
            <FiClock style={{ color: 'var(--blue)', fontSize: '1.1rem' }} /> 
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', opacity: 0.8, marginBottom: 2 }}>Estimasi Selesai</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <span>{getEstimatedDate(order)}</span>
                <span style={{ color: 'var(--blue)', fontWeight: 700 }}>• {remaining}</span>
              </div>
            </div>
          </div>
        )}

        <div className="order-footer" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="order-total">
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-4)', marginBottom: 2 }}>Total Bayar</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--navy)' }}>{formatRupiah(order.total_price)}</strong>
          </div>
          <div className="order-actions" style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => openDetailModal(order.id)}>
              <FiEye /> Detail
            </button>
            {order.total_price > 0 && (
              <button
                className={`btn btn-sm ${
                  order.payment_status === 'paid'
                    ? 'btn-paid'
                    : order.payment_proof
                    ? 'btn-waiting-validation'
                    : ''
                }`}
                onClick={() => openPaymentModal(order.id)}
              >
                {order.payment_status === 'paid' ? (
                  <><FiCheckCircle /> Lunas</>
                ) : order.payment_proof ? (
                  <><FiClock /> Menunggu Validasi</>
                ) : (
                  <><FiDollarSign /> Pembayaran</>
                )}
              </button>
            )}
            {order.status === 'antar' && (
              <button className="btn btn-sm" onClick={() => completeOrder(order.id)}>
                <FiHome /> Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="customer-dashboard">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-text">
            <h2>Halo, <span className="highlight">{user.name || 'Customer'}! </span></h2>
            <p>Kelola pesanan laundry kamu dengan mudah di sini.</p>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats singkat */}

        {/* Header */}
        <div className="dashboard-header">
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', color: 'var(--navy)' }}>
            Pesanan Aktif
          </h2>
          <div className="header-actions">
            <Link to="/history" className="btn btn-secondary"><FiList /> Riwayat</Link>
            <button className="btn" onClick={() => navigate('/order')}><FiPlus /> Order Baru</button>
          </div>
        </div>

        {/* Voucher Info */}
        {voucherStatus && (
          <div className="voucher-card">
            <div className="voucher-info">
              <FiGift className="voucher-icon" />
              <div>
                <h4>Klaim Voucher Gratis!</h4>
                <p>Dapatkan voucher menarik untuk setiap pesananmu.</p>
              </div>
            </div>
            {voucherStatus.canClaim ? (
              <button className="btn btn-sm" onClick={claimVoucher}>🎁 Klaim Sekarang</button>
            ) : (
              <span className="voucher-badge">{voucherStatus.need} order lagi</span>
            )}
          </div>
        )}

        {/* Order List */}
        {ongoing.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FiPackage style={{ fontSize: '2.5rem', color: 'var(--text-4)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-3)', marginBottom: 16 }}>Belum ada order aktif.</p>
            <button className="btn" onClick={() => navigate('/order')}><FiPlus /> Buat Order Pertama</button>
          </div>
        )}

        {ongoing.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}

        {/* Modal Pembayaran */}
        {paymentModal && (
          <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
              <div className="detail-header">
                <h3><FiCreditCard style={{ marginRight: 8 }} />Pembayaran</h3>
                <button className="btn-close" onClick={() => setPaymentModal(null)}>×</button>
              </div>

              <div className="detail-section">
                <h4>Info Pesanan</h4>
                <div style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Kode Order</span>
                    <strong>{paymentModal.order_code}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Status</span>
                    <span className={`status-badge status-${paymentModal.status}`}>{statusLabels[paymentModal.status]}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Layanan</span>
                    <span>
                      {paymentModal.service_speed === 'express' ? <FiZap style={{ marginRight: 4 }} /> : <FiPackage style={{ marginRight: 4 }} />}
                      {formatServiceLabel(paymentModal)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Total</span>
                    <strong style={{ color: 'var(--navy)', fontSize: '1.1rem' }}>{formatRupiah(paymentModal.total_price)}</strong>
                  </div>
                </div>
              </div>

              {paymentModal.payment_status === 'paid' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 8, color: 'var(--green)' }}><FiCheckCircle /></div>
                  <p style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1.05rem' }}>Pembayaran Lunas</p>
                  {paymentModal.payment_date && (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 4 }}>
                      Tanggal: {formatDateTime(paymentModal.payment_date)}
                    </p>
                  )}
                  {paymentModal.payment_proof && (
                    <img src={resolveFileUrl(paymentModal.payment_proof)} alt="Bukti" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, marginTop: 14 }} />
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <p style={{ color: 'var(--text-3)', marginBottom: 16, fontSize: '0.9rem' }}>Scan QR Code berikut untuk melakukan pembayaran</p>
                  <img
                    src="/qris.jpg"
                    alt="QRIS"
                    style={{ maxWidth: 280, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', padding: 12, background: 'white' }}
                  />
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a 
                      href="/qris.jpg" 
                      download="Alinea_Laundry_QRIS.jpg" 
                      className="btn" 
                      style={{ padding: '8px 16px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                      <FiDownload /> Simpan QRIS
                    </a>
                    <button className="btn" onClick={() => uploadPayment(paymentModal.id)} style={{ padding: '8px 16px', background: '#3b82f6' }}>
                      <FiDollarSign /> Upload Bukti
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '8px 16px', border: '1px solid #3b82f6', color: '#3b82f6' }} onClick={async () => {
                      setOrders(prev => prev.map(o => o.id === paymentModal.id ? { ...o, payment_proof: 'uploaded' } : o));
                      alert('Segera upload bukti pembayaran untuk validasi oleh admin.');
                      setPaymentModal(null);
                    }}>
                      <FiCheckCircle /> Sudah Bayar
                    </button>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPaymentModal(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detail */}
        {detailModal && (
          <div className="modal-overlay" onClick={() => setDetailModal(null)}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
              <div className="detail-header">
                <h3>📋 Detail Pesanan</h3>
                <button className="btn-close" onClick={() => setDetailModal(null)}>×</button>
              </div>

              <div className="detail-section">
                <h4>Info Pesanan</h4>
                <div style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Kode Order</span><strong>{detailModal.order_code}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Tanggal Order</span><span>{formatDateTime(detailModal.created_at)}</span></div>
                  {(detailModal.status === 'selesai' || detailModal.status === 'batal') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-3)' }}>{detailModal.status === 'batal' ? 'Dibatalkan Pada' : 'Tanggal Selesai'}</span>
                      <span>{formatDateTime(detailModal.updated_at)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Status</span><span className={`status-badge status-${detailModal.status}`}>{statusLabels[detailModal.status]}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Layanan</span><span style={{ display: 'flex', alignItems: 'center', gap: 4, textAlign: 'right', justifyContent: 'flex-end' }}>{detailModal.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(detailModal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Alamat</span><span style={{ textAlign: 'right', flex: 1, fontSize: '0.85rem' }}>{detailModal.address || '-'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Total</span><strong style={{ color: 'var(--navy)', fontSize: '1.05rem', textAlign: 'right' }}>{formatRupiah(detailModal.total_price)}</strong></div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Item Laundry</h4>
                <div style={{ overflowX: 'auto', width: '100%', marginBottom: 10 }}>
                  <table className="invoice-table" style={{ minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th>Layanan</th>
                        <th>Nama</th>
                        <th>Harga/Unit</th>
                        <th>Jumlah</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.items?.map(item => {
                        const qty = item.service_type === 'kiloan' ? item.weight : item.qty_items;
                        const subtotal = qty * item.price_per_unit;
                        return (
                          <tr key={item.id}>
                            <td>{item.service_type === 'kiloan' ? 'Kiloan' : 'Satuan'}</td>
                            <td>{item.name || '-'}</td>
                            <td>{formatRupiah(item.price_per_unit)}</td>
                            <td>{item.service_type === 'kiloan' ? `${item.weight} kg` : `${item.qty_items} pcs`}</td>
                            <td style={{ textAlign: 'right' }}>{formatRupiah(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {detailModal.express_fee > 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600 }}>Biaya Express</td>
                          <td style={{ textAlign: 'right' }}>{formatRupiah(detailModal.express_fee)}</td>
                        </tr>
                      )}
                      {detailModal.discount > 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>Diskon (Voucher)</td>
                          <td style={{ textAlign: 'right', color: '#ef4444' }}>-{formatRupiah(detailModal.discount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>Total Akhir</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>{formatRupiah(detailModal.total_price)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {detailModal.admin_note && (
                  <div style={{ marginTop: 12, padding: '12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan Tambahan dari Admin</div>
                    <div style={{ fontSize: '0.85rem', color: '#14532d', whiteSpace: 'pre-wrap' }}>{detailModal.admin_note}</div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <FloatingWA />
    </div>
  );
};

export default CustomerDashboard;