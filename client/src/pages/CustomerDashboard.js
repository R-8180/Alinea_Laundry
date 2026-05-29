import React, { useState, useEffect } from 'react';
import ProfileTab from '../components/ProfileTab';
import FloatingWA from '../components/FloatingWA';
import ReceiptDownloader from '../components/ReceiptDownloader';
import InstallPWA from '../components/InstallPWA';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError, showLoading } from '../utils/swal';
import Swal from 'sweetalert2';
import {
  FiClock, FiTruck, FiDroplet, FiPackage, FiCheckCircle,
  FiPlus, FiGift, FiCopy, FiEye, FiDollarSign, FiXCircle, FiZap, FiCreditCard, FiDownload, FiUser, FiMapPin, FiClipboard, FiMessageCircle, FiStar, FiX
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

const formatWA = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) return clean;
  return clean.startsWith('0') ? '62' + clean.slice(1) : '62' + clean;
};

const statusLabels = {
  menunggu: 'Menunggu Jemput',
  pickup: 'Sedang Dijemput',
  proses: 'Diproses',
  antar: 'Menunggu Diantar',
  sedang_diantar: 'Sedang Diantar',
  selesai: 'Selesai',
  batal: 'Dibatalkan',
};

const statusOrder = ['menunggu', 'pickup', 'proses', 'antar', 'selesai'];

const stepIcons = {
  menunggu: <FiClock />,
  pickup: <FiTruck />,
  proses: <FiDroplet />,
  antar: <FiPackage />,
  sedang_diantar: <FiPackage />,
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


const CustomerDashboard = ({ user: propUser }) => {
  const [orders, setOrders] = useState([]);
  const [paymentModal, setPaymentModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const renderDynamicSubtext = (order) => {
    let msg = '';
    let iconColor = 'var(--blue)';
    let bgColor = 'var(--sky-pale)';
    let borderColor = 'var(--sky)';
    
    switch (order.status) {
      case 'menunggu':
        msg = 'Laundry Anda sedang dalam antrean penjemputan oleh kurir kami. Mohon ditunggu ya! 😊';
        break;
      case 'pickup':
        msg = 'Kurir kami sedang meluncur ke lokasi Anda untuk menjemput laundry. Mohon bersiap ya! 🛵';
        iconColor = '#10b981';
        bgColor = '#e6fcf0';
        borderColor = '#a7f3d0';
        break;
      case 'proses':
        msg = 'Laundry Anda sudah tiba di outlet dan sedang diproses dengan higienis oleh tim kami. 🧼';
        break;
      case 'antar':
        msg = 'Laundry Anda telah selesai dicuci bersih & rapi! Sekarang sedang menunggu giliran pengantaran oleh kurir. 📦';
        break;
      case 'sedang_diantar':
        msg = 'Kabar baik! Laundry Anda sedang dalam perjalanan diantarkan kembali ke lokasi Anda oleh kurir. Siap-siap menerima ya! 🛵✨';
        iconColor = '#10b981';
        bgColor = '#e6fcf0';
        borderColor = '#a7f3d0';
        break;
      case 'selesai':
        msg = 'Laundry Anda telah sukses diterima dengan bersih dan wangi. Terima kasih telah mempercayakan Alinea Laundry! 🥰';
        iconColor = '#10b981';
        bgColor = '#e6fcf0';
        borderColor = '#a7f3d0';
        break;
      case 'batal':
        msg = 'Pesanan ini telah dibatalkan. Hubungi admin jika terdapat kendala.';
        iconColor = '#ef4444';
        bgColor = '#fee2e2';
        borderColor = '#fca5a5';
        break;
      default:
        return null;
    }
    
    return (
      <div style={{
        marginTop: 16,
        padding: '12px 16px',
        borderRadius: 12,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: 'var(--sh-sm)'
      }}>
        <div style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', color: iconColor }}>
          {order.status === 'proses' ? <FiDroplet /> : (order.status === 'selesai' ? <FiCheckCircle /> : (order.status === 'batal' ? <FiXCircle /> : <FiTruck />))}
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 500, lineHeight: 1.4 }}>
          {msg}
        </p>
      </div>
    );
  };
  const [voucherStatus, setVoucherStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  
  // Use the reactive user prop, or fall back to cached localStorage user details
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const user = propUser || localUser;

  // Read ?tab=profile from URL to switch tab on navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'profile') setActiveTab('profile');
    else if (params.get('tab') === 'orders') setActiveTab('orders');
  }, [location.search]);

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

  const claimVoucher = async (templateId) => {
    try {
      await axios.post('/api/orders/voucher/claim', { template_id: templateId }, { headers: { Authorization: `Bearer ${token}` } });
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Voucher berhasil diklaim!',
        confirmButtonColor: '#6366f1'
      });
      fetchVoucherStatus();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.response?.data?.message || 'Gagal klaim voucher',
        confirmButtonColor: '#6366f1'
      });
    }
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
    showSuccess('Salin Kode', 'Kode order laundry berhasil disalin!');
  };

  const uploadPayment = (orderId) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData(); fd.append('proof', file);
      showLoading('Mengunggah Bukti', 'Sedang mengunggah foto...');
      try {
        await axios.post(`/api/payments/${orderId}/upload`, fd, { headers: { Authorization: `Bearer ${token}` } });
        await showSuccess('Unggah Bukti', 'Bukti pembayaran Anda berhasil diunggah!'); 
        fetchOrders();
        
        // Perbarui data modal pembayaran secara real-time agar UI ter-update
        const res = await axios.get(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        setPaymentModal(res.data);
      } catch (err) {
        showError('Unggah Gagal', err.response?.data?.message || 'Gagal mengunggah bukti pembayaran');
      }
    };
    inp.click();
  };




  const ongoing = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal');
  const formatDateTime = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

  const renderProgressBar = (order) => {
    const activeStatus = order.status === 'sedang_diantar' ? 'antar' : order.status;
    const currentIdx = statusOrder.indexOf(activeStatus);
    const percent = ((currentIdx + 1) / statusOrder.length) * 100;
    return (
      <div className="progress-container">
        <div className="progress-steps">
          {statusOrder.map((step, idx) => {
            const isActive = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const label = isCurrent && step === 'antar' ? statusLabels[order.status] : statusLabels[step];
            return (
              <div key={step} className={`progress-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="progress-dot">{stepIcons[step]}</div>
                <span className="progress-label">{label}</span>
              </div>
            );
          })}
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

        {(order.status === 'antar' || order.status === 'pickup' || order.status === 'sedang_diantar') && order.courier_name && order.courier_phone && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: '#e6fcf0', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid #10b981'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiTruck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>{order.status === 'pickup' ? 'Kurir Penjemput' : 'Kurir Pengantar'}</div>
                <div style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: 800 }}>{order.courier_name}</div>
              </div>
            </div>
            <a 
              href={`https://wa.me/${formatWA(order.courier_phone)}?text=${encodeURIComponent(`Halo Mas/Mbak ${order.courier_name}, saya ${user.name || 'pelanggan'} ingin bertanya terkait pesanan laundry saya dengan nomor order ${order.order_code}.`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                background: '#10b981', color: 'white', padding: '8px 14px',
                borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none'
              }}
            >
              <FiMessageCircle /> Hubungi
            </a>
          </div>
        )}

        {renderProgressBar(order)}
        {renderDynamicSubtext(order)}

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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="customer-dashboard">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div className="welcome-text">
            <h2>Halo, <span className="highlight">{user.name || 'Customer'}! </span></h2>
            <p>Kelola pesanan laundry kamu dengan mudah di sini.</p>
          </div>
          {voucherStatus && (
            <div className="dashboard-points-card">
               <div className="dashboard-points-info">
                 <div className="dashboard-points-icon-wrapper">
                   <FiStar style={{ color: '#fff', fontSize: '1.3rem' }} />
                 </div>
                 <div className="dashboard-points-text">
                   <span>Total Poinmu</span>
                   <strong>{voucherStatus.points || 0} Poin</strong>
                 </div>
               </div>
               <button onClick={() => setShowVoucherModal(true)} className="dashboard-points-button">
                 <FiGift style={{ fontSize: '1.1rem' }} /> Tukar Voucher
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="container">
        {/* Subtle PWA install prompt */}
        <InstallPWA variant="dashboard" />

        {/* Stats singkat */}

        {/* Header Tabs */}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          marginBottom: 20, 
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none' /* IE 10+ */
        }} className="no-scrollbar">
          <button 
            onClick={() => setActiveTab('orders')}
            style={{ 
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 10px', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'orders' ? '3px solid var(--blue)' : '3px solid transparent', 
              color: activeTab === 'orders' ? 'var(--blue)' : 'var(--text-3)', 
              fontWeight: activeTab === 'orders' ? 700 : 500, 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              fontSize: '0.85rem' 
            }}>
            <FiPackage style={{ marginRight: 6, fontSize: '1.05rem', flexShrink: 0 }} /> Pesanan Saya
          </button>
          <button 
            onClick={() => navigate('/history')}
            style={{ 
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 10px', 
              background: 'none', 
              border: 'none', 
              borderBottom: '3px solid transparent', 
              color: 'var(--text-3)', 
              fontWeight: 500, 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              fontSize: '0.85rem' 
            }}>
            <FiClock style={{ marginRight: 6, fontSize: '1.05rem', flexShrink: 0 }} /> Riwayat
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            style={{ 
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 10px', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === 'profile' ? '3px solid var(--blue)' : '3px solid transparent', 
              color: activeTab === 'profile' ? 'var(--blue)' : 'var(--text-3)', 
              fontWeight: activeTab === 'profile' ? 700 : 500, 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              fontSize: '0.85rem' 
            }}>
            <FiUser style={{ marginRight: 6, fontSize: '1.05rem', flexShrink: 0 }} /> Profil &amp; Alamat
          </button>
        </div>

        {activeTab === 'orders' ? (
          <>
             {/* Header Pesanan */}
             <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', color: 'var(--navy)', margin: 0 }}>
                 Pesanan Aktif
               </h2>
               <div className="header-actions">
                 <button className="btn" onClick={() => navigate('/order')}><FiPlus /> Order Baru</button>
               </div>
             </div>

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
          </>
        ) : (
          <ProfileTab user={user} />
        )}

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
                  {paymentModal.payment_proof && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      border: '1.5px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <FiCheckCircle /> Foto bukti pembayaran sudah terupload!
                    </div>
                  )}

                  <p style={{ color: 'var(--text-3)', marginBottom: 16, fontSize: '0.9rem' }}>Scan QR Code berikut untuk melakukan pembayaran</p>
                  <img
                    src="/qris.jpg"
                    alt="QRIS"
                    style={{ maxWidth: 280, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', padding: 12, background: 'white' }}
                  />

                  {paymentModal.payment_proof && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 8, fontWeight: '600' }}>Bukti Pembayaran Anda:</p>
                      <img
                        src={resolveFileUrl(paymentModal.payment_proof)}
                        alt="Bukti Terupload"
                        style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--sh-sm)' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a 
                      href="/qris.jpg" 
                      download="Alinea_Laundry_QRIS.jpg" 
                      className="btn" 
                      style={{ padding: '8px 16px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                      <FiDownload /> Simpan QRIS
                    </a>
                    <button 
                      className="btn" 
                      onClick={() => uploadPayment(paymentModal.id)} 
                      style={{ 
                        padding: '8px 16px', 
                        background: paymentModal.payment_proof ? '#10b981' : '#3b82f6', 
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {paymentModal.payment_proof ? <FiCheckCircle /> : <FiDollarSign />}
                      {paymentModal.payment_proof ? 'Bukti Terupload' : 'Upload Bukti'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ 
                        padding: '8px 16px', 
                        border: paymentModal.payment_proof ? '1px solid #10b981' : '1px solid #3b82f6', 
                        color: paymentModal.payment_proof ? '#10b981' : '#3b82f6' 
                      }} 
                      onClick={() => {
                        if (!paymentModal.payment_proof) {
                          showError('Bukti Belum Diunggah', 'Gagal: Anda belum mengunggah foto bukti pembayaran!');
                          return;
                        }
                        showSuccess('Pembayaran Terkirim', 'Pembayaran Anda sedang divalidasi oleh admin. Terima kasih banyak!');
                        setPaymentModal(null);
                      }}
                    >
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
                <h3><FiClipboard className="icon-inline" /> Detail Pesanan</h3>
                <button className="btn-close" onClick={() => setDetailModal(null)}>×</button>
              </div>

              <div className="detail-section">
                <h4>Info Pesanan</h4>
                <div style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Kode Order</span><strong>{detailModal.order_code}</strong></div>
                  {detailModal.branch_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-3)' }}>Cabang</span>
                      <strong style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiMapPin /> {detailModal.branch_name}
                      </strong>
                    </div>
                  )}
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
                        <th>Parfum</th>
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
                            <td style={{ color: '#7c3aed', fontWeight: 600 }}>{item.parfum || '-'}</td>
                            <td>{formatRupiah(item.price_per_unit)}</td>
                            <td>{item.service_type === 'kiloan' ? `${item.weight} kg` : `${item.qty_items} pcs`}</td>
                            <td style={{ textAlign: 'right' }}>{formatRupiah(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {detailModal.additional_charge !== 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'right', fontWeight: 600, color: detailModal.additional_charge < 0 ? '#ef4444' : 'inherit' }}>
                            {detailModal.additional_charge < 0 ? 'Potongan / Diskon' : 'Biaya Tambahan'}
                          </td>
                          <td style={{ textAlign: 'right', color: detailModal.additional_charge < 0 ? '#ef4444' : 'inherit' }}>
                            {detailModal.additional_charge < 0 ? `-${formatRupiah(Math.abs(detailModal.additional_charge))}` : formatRupiah(detailModal.additional_charge)}
                          </td>
                        </tr>
                      )}
                      {detailModal.express_fee > 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'right', fontWeight: 600 }}>Biaya Express</td>
                          <td style={{ textAlign: 'right' }}>{formatRupiah(detailModal.express_fee)}</td>
                        </tr>
                      )}
                      {detailModal.voucher_name && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>Voucher Terpakai</td>
                          <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{detailModal.voucher_name}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>Total Akhir</td>
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

              <ReceiptDownloader order={detailModal} />

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <FloatingWA />
      {/* ====== MODAL TUKAR VOUCHER ====== */}
      {showVoucherModal && voucherStatus && (
        <div className="modal-overlay" onClick={() => setShowVoucherModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="detail-header">
              <h3><FiGift style={{ marginRight: 8, color: 'var(--blue)' }} /> Tukar Poin dengan Voucher</h3>
              <button className="btn-close" onClick={() => setShowVoucherModal(false)}><FiX /></button>
            </div>
            
            <div style={{ background: 'var(--sky-pale)', padding: '12px 16px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Poin Tersedia</span>
              <span style={{ background: 'var(--blue)', color: 'white', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>{voucherStatus.points || 0} Poin</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {voucherStatus.templates && voucherStatus.templates.map(t => (
                <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--navy)' }}>{t.name}</h5>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', margin: '0 0 6px 0' }}>{t.description || 'Syarat dan ketentuan berlaku.'}</p>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue)' }}>Harga: {t.points_required} Poin</span>
                  </div>
                  <button 
                    onClick={() => { claimVoucher(t.id); setShowVoucherModal(false); }}
                    className="btn btn-sm" 
                    style={{ background: voucherStatus.points >= t.points_required ? 'var(--blue)' : '#cbd5e1', cursor: voucherStatus.points >= t.points_required ? 'pointer' : 'not-allowed', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px' }}
                    disabled={voucherStatus.points < t.points_required}
                  >
                    Klaim
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowVoucherModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;