import React, { useState, useEffect, useCallback } from 'react';
import PhotoUploader from '../components/PhotoUploader';
import SearchBar from '../components/SearchBar';
import useDebounce from '../utils/useDebounce';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { showSuccess, showError, showWarning, showConfirm, showLoading } from '../utils/swal';
import {
  FiPackage, FiClock, FiCheckCircle, FiAlertCircle,
  FiUserPlus, FiChevronDown, FiPhone, FiCamera, FiFileText, FiMapPin,
  FiTruck, FiEdit2, FiX, FiEye, FiUsers, FiTag, FiArrowUp, FiArrowDown,
  FiPlus, FiUser, FiMessageCircle, FiZap, FiCreditCard, FiHelpCircle, FiClipboard,
  FiStar, FiTrash2
} from 'react-icons/fi';
import { GiWeight } from 'react-icons/gi';
import ReceiptDownloader from '../components/ReceiptDownloader';

const LaporanTab = React.lazy(() => import('./LaporanTab'));

/* ---------- COMPONENT: FEEDBACK TAB ---------- */
const FeedbackTab = ({ feedbacks, loading, onRefresh, onDeleteAll, onDeleteOne }) => {
  const formatDateTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  const formatWA = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('62')) return clean;
    return clean.startsWith('0') ? '62' + clean.slice(1) : '62' + clean;
  };

  const handleContactWA = (phone, name, comment, rClean, rTidy, rSmell, rTime, rWeb) => {
    const avg = ((rClean + rTidy + rSmell + rTime + rWeb) / 5).toFixed(1);
    const msg = `Halo Kak ${name}, kami dari tim Alinea Laundry ingin mengucapkan terima kasih atas masukan evaluasi rating *${avg}⭐* yang Kakak berikan.\n\n*Rincian Penilaian Kakak:*\n- Kebersihan Cucian: ${rClean}⭐\n- Kerapian Setrika: ${rTidy}⭐\n- Keharuman Parfum: ${rSmell}⭐\n- Ketepatan Kurir: ${rTime}⭐\n- Kemudahan Website: ${rWeb}⭐\n${comment ? `\n*Ulasan Tambahan:*\n"${comment}"\n` : ''}\nMasukan Kakak sangat berharga bagi kami agar bisa terus meningkatkan pelayanan Alinea Laundry. Terima kasih banyak Kak!`;
    window.open(`https://wa.me/${formatWA(phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
        <FiClock style={{ fontSize: '2rem', animation: 'spin 2s linear infinite', marginBottom: 12 }} />
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Memuat data masukan kritik &amp; saran...</div>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0',
        padding: '60px 24px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        marginTop: 16
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, color: '#94a3b8' }}><FiMessageCircle /></div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: 4, fontFamily: 'Outfit, sans-serif' }}>Belum Ada Feedback</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 400, margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
          Saat ini belum ada pelanggan yang mengirimkan kritik atau saran melalui dasbor mereka.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Daftar Feedback Pelanggan</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', margin: '4px 0 0' }}>Rincian tingkat kepuasan dari pelanggan terdaftar</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={onRefresh} style={{ height: '38px', borderRadius: '10px', fontWeight: 700 }}>
            Refresh Feedback
          </button>
          <button 
            className="btn btn-sm" 
            onClick={onDeleteAll} 
            style={{ height: '38px', borderRadius: '10px', fontWeight: 700, background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <FiTrash2 size={14} /> Hapus Semua
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 20,
        marginTop: 8
      }}>
        {feedbacks.map((f) => {
          const rawRatings = [f.rating_kebersihan, f.rating_kerapian, f.rating_parfum, f.rating_waktu, f.rating_web];
          const filled = rawRatings.filter(r => r !== null && r !== undefined && r !== 0);
          const avgRating = filled.length > 0 
            ? (filled.reduce((a, b) => a + Number(b), 0) / filled.length).toFixed(1)
            : '0.0';

          const detailedRatings = [
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiStar /> Kebersihan</span>, value: f.rating_kebersihan },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiCheckCircle /> Kerapian</span>, value: f.rating_kerapian },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiZap /> Keharuman</span>, value: f.rating_parfum },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiTruck /> Ketepatan Kurir</span>, value: f.rating_waktu },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiEye /> Website</span>, value: f.rating_web }
          ];

          return (
            <div
              key={f.id}
              style={{
                background: 'white',
                border: '1.5px solid #e2e8f0',
                borderRadius: 20,
                padding: 24,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
              className="feedback-card"
            >
              <div>
                {/* Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <strong style={{ fontSize: '1.02rem', color: '#0f172a', display: 'block', fontWeight: 800 }}>{f.customer_name || 'Pelanggan'}</strong>
                  </div>
                  {/* Average Rating Badge */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: avgRating >= 4 ? '#10b981' : avgRating >= 3 ? '#eab308' : '#ef4444',
                    background: avgRating >= 4 ? '#e6f4ea' : avgRating >= 3 ? '#fef9c3' : '#fde8e8',
                    padding: '3px 10px',
                    borderRadius: '20px'
                  }}>
                    {avgRating} <FiStar style={{ fill: 'currentColor' }} />
                  </span>
                </div>

                {/* 5 Detailed Metrics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 12px',
                  margin: '12px 0',
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9'
                }}>
                  {detailedRatings.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {item.value ? (
                          <>
                            {item.value} <FiStar style={{ color: '#fbbf24', fill: '#fbbf24', fontSize: '0.8rem' }} />
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Optional feedback text */}
                {f.comment && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#475569',
                    lineHeight: 1.5,
                    background: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: 10,
                    margin: '8px 0 16px 0',
                    fontStyle: 'italic',
                    borderLeft: '3px solid #6366f1',
                    border: '1px solid #f1f5f9',
                    borderLeftColor: '#6366f1'
                  }}>
                    "{f.comment}"
                  </p>
                )}
              </div>

              {/* Footer Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #f1f5f9',
                paddingTop: 14,
                marginTop: 8
              }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  {formatDateTime(f.created_at)}
                </span>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onDeleteOne(f.id)}
                    style={{
                      background: '#fde8e8',
                      border: 'none',
                      color: '#ef4444',
                      padding: '8px 12px',
                      borderRadius: 10,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.2s',
                      fontFamily: 'Outfit, sans-serif'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fde8e8';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    <FiTrash2 size={13} /> Hapus
                  </button>
                  
                  {f.customer_phone && (
                    <button
                      onClick={() => handleContactWA(
                        f.customer_phone, 
                        f.customer_name, 
                        f.comment,
                        f.rating_kebersihan,
                        f.rating_kerapian,
                        f.rating_parfum,
                        f.rating_waktu,
                        f.rating_web
                      )}
                      style={{
                        background: '#e6fcf0',
                        border: 'none',
                        color: '#0e9f6e',
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s',
                        fontFamily: 'Outfit, sans-serif'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#0e9f6e';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#e6fcf0';
                        e.currentTarget.style.color = '#0e9f6e';
                      }}
                    >
                      <FiMessageCircle size={14} /> Hubungi via WA
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- KONSTANTA ---------- */
const statusLabels = { menunggu: 'Menunggu', pickup: 'Dijemput', proses: 'Diproses', antar: 'Diantar', sedang_diantar: 'Sedang Diantar', selesai: 'Selesai', batal: 'Dibatalkan' };

// Helper: resolve file URL for both old local paths and new Supabase URLs
const resolveFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  let base = process.env.REACT_APP_API_URL || '';
  if (!base && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    base = 'http://localhost:5000';
  }
  return `${base}${url}`;
};

const statusOptions = ['menunggu', 'pickup', 'proses', 'antar', 'sedang_diantar', 'selesai', 'batal'];
// Tambah 'all_active' di paling depan

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
      return `Halo Kak ${name}, kabar baik! Pakaian bersih Anda untuk pesanan *${code}* saat ini *sedang dalam proses pengantaran* oleh kurir kembali ke alamat Anda. Mohon bersiap untuk menerima pakaian bersih Anda ya Kak. Terima kasih!`;
    case 'sedang_diantar':
      return `Halo Kak ${name}, kabar baik! Kurir kami saat ini *sedang dalam perjalanan* mengantarkan laundry wangi Anda #${code} kembali ke alamat tujuan. Mohon bersiap untuk menerima pakaian bersih Anda ya Kak. Terima kasih!`;
    case 'selesai':
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* telah dinyatakan *Selesai dan Diterima* dengan baik. Terima kasih banyak telah mempercayakan laundry Anda kepada Alinea Laundry! Semoga Kakak puas dengan layanan kami.`;
    case 'batal':
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* telah *Dibatalkan*. Jika Kakak membutuhkan bantuan atau ada kekeliruan, silakan hubungi admin kami. Terima kasih.`;
    default:
      return `Halo Kak ${name}, pesanan laundry Anda dengan kode *${code}* sedang kami proses. Terima kasih!`;
  }
};



const categoryLabels = {
  cuci_setrika: 'Cuci Setrika',
  cuci_lipat: 'Cuci Lipat',
  satuan: 'Satuan',
};

// Format label layanan lengkap: "Cuci Setrika · Express · 3 Jam"
const formatServiceLabel = (order) => {
  const cat = categoryLabels[order.service_category] || order.service_name || '';
  const speed = order.service_speed === 'express' ? 'Express' : 'Reguler';
  let duration = '';
  if (order.service_time_days > 0) duration = `${order.service_time_days} Hari`;
  else if (order.service_time_hours > 0) duration = `${order.service_time_hours} Jam`;
  const parts = [cat, speed, duration].filter(Boolean);
  return parts.join(' · ');
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
      if (diff <= 0) return 'Terlambat';
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

/* ---------- ESTIMASI CELL ---------- */
const EstimasiCell = ({ order, onEdit, formatDateTime }) => {
  const countdown = useCountdown(order);
  const hasEstimasi = order.estimated_days > 0 || order.estimated_hours > 0;

  return (
    <div>
      {hasEstimasi ? (
        <>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 600 }}>
            {order.estimated_days > 0 ? `${order.estimated_days}h ` : ''}
            {order.estimated_hours > 0 ? `${order.estimated_hours}j` : ''}
          </div>
          {countdown && order.status !== 'selesai' && order.status !== 'batal' && (
            <div style={{ fontSize: '0.72rem', color: countdown === 'Terlambat' ? '#ef4444' : '#0284c7', fontWeight: 700 }}>
              {countdown}
            </div>
          )}
        </>
      ) : (
        <span style={{ color: 'var(--text-4)', fontSize: '0.78rem' }}>Belum diset</span>
      )}
      <button className="btn-edit-estimasi" onClick={() => onEdit(order.id)}>
        <FiEdit2 style={{ marginRight: 3 }} /> Edit
      </button>
    </div>
  );
};

/* ---------- SMALL COUNTDOWN (FOR MOBILE CARDS) ---------- */
const SmallCountdown = ({ order }) => {
  const countdown = useCountdown(order);
  if (!countdown || countdown === '-' || order.status === 'selesai' || order.status === 'batal') return null;
  return (
    <div style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 800, marginTop: 3 }}>
      {countdown}
    </div>
  );
};

/* ================================================================
   ADMIN DASHBOARD
   ================================================================ */
// Cache lokal untuk transisi page instan (SWR)
let cachedOrders = null;
let cachedYesterdayStats = null;

// Komponen skeleton tabel admin — tambahkan di atas AdminDashboard
const TableSkeleton = ({ rows = 5 }) => (
  <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
    {/* Header tabel skeleton */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12, padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
      {['Kode', 'Customer', 'Layanan', 'Status', 'Total', 'Aksi'].map((_, i) => (
        <div key={i} className="skeleton-text" style={{ width: '70%' }} />
      ))}
    </div>
    {/* Rows skeleton */}
    {[...Array(rows)].map((_, rowIdx) => (
      <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div className="skeleton" style={{ height: 22, width: '80%' }} />
        <div className="skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton-text" style={{ width: '75%' }} />
        <div className="skeleton" style={{ height: 24, width: 90, borderRadius: 99 }} />
        <div className="skeleton-text" style={{ width: '65%' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="skeleton" style={{ width: 32, height: 32 }} />
          <div className="skeleton" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    ))}
  </div>
);

const AdminDashboard = () => {
  const location = useLocation();

  const getTabFromUrl = () => {
    const t = new URLSearchParams(location.search).get('tab');
    if (t === 'laporan') return 'laporan';
    if (t === 'riwayat') return 'riwayat';
    if (t === 'users') return 'users';
    if (t === 'bantuan') return 'bantuan';
    if (t === 'feedback') return 'feedback';
    return 'order';
  };

  /* ---------- STATE ---------- */
  const [orders, setOrders] = useState(cachedOrders || []);
  const [tab, setTabState] = useState(getTabFromUrl);
  // Default subtab sekarang 'all_active'
  const [subTab, setSubTab] = useState('all_active');
  const [loading, setLoading] = useState(!cachedOrders);
  const [validateModal, setValidateModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [completePhoto, setCompletePhoto] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showAll, setShowAll] = useState(false);
  const [yesterdayStats, setYesterdayStats] = useState(cachedYesterdayStats);
  // Users tab state
  const [customers, setCustomers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [customerModal, setCustomerModal] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [addOrderModal, setAddOrderModal] = useState(null);
  const [bantuanDirectory, setBantuanDirectory] = useState([]);
  const [activeFaq, setActiveFaq] = useState(null);
  const [newOrderForm, setNewOrderForm] = useState({ address: '', notes: '', service_speed: 'reguler', items: [{ service_type: 'kiloan', name: '' }] });
  const [couriers, setCouriers] = useState([]);
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Parse user and branch filter state
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.branch_id === null;
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Custom Dropdowns States
  const [activeStatusDropdownOrderId, setActiveStatusDropdownOrderId] = useState(null);
  const [courierDropdownOpen, setCourierDropdownOpen] = useState(false);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);
  const [activeModalItemTypeIndex, setActiveModalItemTypeIndex] = useState(null);
  const [editEstimasiModal, setEditEstimasiModal] = useState(null);
  const [branchModal, setBranchModal] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const branchOptions = [
    { id: '', name: 'Semua Cabang' },
    { id: '1', name: 'Sampangan' },
    { id: '2', name: 'Unnes' },
    { id: '3', name: 'Tlogosari' }
  ];


  useEffect(() => { setTabState(getTabFromUrl()); }, [location.search]); // eslint-disable-line

  /* ---------- FETCH ---------- */
  const fetchOrders = useCallback(async () => {
    try {
      const url = selectedBranchFilter ? `/api/admin/orders?branch_id=${selectedBranchFilter}` : '/api/admin/orders';
      const res = await axios.get(url, { headers: getHeaders() });
      setOrders(res.data);
      cachedOrders = res.data; // Simpan di cache
    } catch (err) {
      console.error('fetchOrders error:', err.response?.status, err.response?.data || err.message);
      showError('Gagal Memuat', 'Gagal memuat data order laundry.');
    } finally { setLoading(false); }
  }, [selectedBranchFilter]); // eslint-disable-line

  const fetchYesterdayStats = useCallback(async () => {
    try {
      const url = selectedBranchFilter ? `/api/admin/stats/yesterday?branch_id=${selectedBranchFilter}` : '/api/admin/stats/yesterday';
      const res = await axios.get(url, { headers: getHeaders() });
      setYesterdayStats(res.data);
      cachedYesterdayStats = res.data; // Simpan di cache
    } catch { }
  }, [selectedBranchFilter]); // eslint-disable-line

  const fetchCustomers = useCallback(async () => {
    try {
      const url = selectedBranchFilter ? `/api/admin/customers?branch_id=${selectedBranchFilter}` : '/api/admin/customers';
      const res = await axios.get(url, { headers: getHeaders() });
      setCustomers(res.data || []);
    } catch (err) {
      console.error('fetchCustomers error:', err.response?.data || err.message);
      setCustomers([]);
    }
  }, [selectedBranchFilter]); // eslint-disable-line

  const fetchBantuanDirectory = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/bantuan-directory', { headers: getHeaders() });
      setBantuanDirectory(res.data || []);
    } catch (err) {
      console.error('fetchBantuanDirectory error:', err);
      setBantuanDirectory([]);
    }
  }, []); // eslint-disable-line

  const fetchFeedbacks = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const res = await axios.get('/api/feedback', { headers: getHeaders() });
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error('fetchFeedbacks error:', err);
      setFeedbacks([]);
    } finally {
      setFeedbackLoading(false);
    }
  }, []); // eslint-disable-line

  const handleDeleteAllFeedbacks = async () => {
    const confirmRes = await showConfirm(
      'Hapus Semua Feedback',
      'Apakah Anda yakin ingin menghapus seluruh kritik & saran dari pelanggan? Tindakan ini permanen.'
    );
    if (!confirmRes.isConfirmed) return;
    
    showLoading('Menghapus...', 'Sedang menghapus semua data feedback...');
    try {
      await axios.delete('/api/feedback', { headers: getHeaders() });
      setFeedbacks([]);
      showSuccess('Hapus Berhasil', 'Semua masukan kritik & saran berhasil dibersihkan.');
    } catch (err) {
      showError('Gagal Menghapus', err.response?.data?.error || 'Terjadi kesalahan saat menghapus feedback.');
    }
  };

  const handleDeleteOneFeedback = async (id) => {
    const confirmRes = await showConfirm(
      'Hapus Feedback',
      'Apakah Anda yakin ingin menghapus kritik & saran ini?'
    );
    if (!confirmRes.isConfirmed) return;

    showLoading('Menghapus...', 'Sedang menghapus feedback...');
    try {
      await axios.delete(`/api/feedback/${id}`, { headers: getHeaders() });
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      showSuccess('Hapus Berhasil', 'Masukan kritik & saran berhasil dihapus.');
    } catch (err) {
      showError('Gagal Menghapus', err.response?.data?.error || 'Terjadi kesalahan saat menghapus feedback.');
    }
  };
 
  useEffect(() => { fetchOrders(); fetchYesterdayStats(); }, [fetchOrders, fetchYesterdayStats]);
  useEffect(() => { if (tab === 'users') fetchCustomers(); }, [tab, fetchCustomers]);
  useEffect(() => { if (tab === 'bantuan') fetchBantuanDirectory(); }, [tab, fetchBantuanDirectory]);
  useEffect(() => { if (tab === 'feedback') fetchFeedbacks(); }, [tab, fetchFeedbacks]);

  /* ---------- HANDLERS ---------- */
  const fetchCouriers = async () => {
    try {
      const res = await axios.get('/api/admin/couriers', { headers: getHeaders() });
      setCouriers(res.data || []);
    } catch (err) {
      console.error('fetchCouriers error:', err);
      setCouriers([]);
    }
  };

  const updatePaymentStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/admin/orders/${id}/payment-status`, { payment_status: newStatus }, { headers: getHeaders() });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: newStatus } : o));
      showSuccess('Status Pembayaran Diperbarui', 'Berhasil mengubah status pembayaran.');
      fetchYesterdayStats();
    } catch (err) {
      showError('Gagal Update Pembayaran', err.response?.data?.message || 'Terjadi kesalahan jaringan.');
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (newStatus === 'selesai') {
      setCompleteModal({ orderId: id });
      setCompletePhoto(null);
      return;
    }
    // Konfirmasi jika admin membatalkan order
    if (newStatus === 'batal') {
      const confirmRes = await showConfirm('Batalkan Pesanan', 'Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.');
      if (!confirmRes.isConfirmed) return;
    }
    
    showLoading('Memperbarui Status', 'Mohon tunggu sebentar...');
    try {
      await axios.put(`/api/admin/orders/${id}/status`, { status: newStatus }, { headers: getHeaders() });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      fetchCustomers(); // update riwayat pengguna saat status berubah
      showSuccess('Status Diperbarui', `Status pesanan #${id} menjadi ${newStatus}`);
    } catch (err) {
      console.error('Update status error:', err);
      showError('Gagal Memperbarui Status', err.response?.data?.message || 'Terjadi kesalahan jaringan.');
    }
  };

  const handleCompleteOrder = async () => {
    if (!completeModal) return;
    showLoading('Menyelesaikan Pesanan', 'Mengunggah bukti dan memperbarui status...');
    try {
      if (completePhoto) {
        // Jika ada foto, kirim sebagai FormData (multipart)
        const fd = new FormData();
        fd.append('photo', completePhoto);
        await axios.put(`/api/admin/orders/${completeModal.orderId}/complete`, fd, {
          headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Jika tanpa foto, kirim JSON biasa
        await axios.put(`/api/admin/orders/${completeModal.orderId}/complete`, {}, {
          headers: getHeaders()
        });
      }
      setCompleteModal(null);
      setCompletePhoto(null);
      // Refresh semua data agar summary cards & tab Pengguna ikut update
      await fetchOrders();
      await fetchYesterdayStats();
      fetchCustomers(); // selalu refresh agar riwayat pengguna ikut update
      showSuccess('Pesanan Selesai', 'Pesanan laundry berhasil diselesaikan!');
    } catch (err) {
      console.error('Complete error:', err.response?.data);
      showError('Gagal Menyelesaikan', err.response?.data?.message || err.response?.data?.error || 'Gagal menyelesaikan pesanan.');
    }
  };

  const openCustomerDetail = async (customer) => {
    setCustomerModal(customer);
    try {
      const [resOrders, resAddresses] = await Promise.all([
        axios.get(`/api/admin/customers/${customer.id}/orders`, { headers: getHeaders() }),
        axios.get(`/api/admin/customers/${customer.id}/addresses`, { headers: getHeaders() })
      ]);
      setCustomerOrders(resOrders.data);
      setCustomerAddresses(resAddresses.data);
    } catch { 
      setCustomerOrders([]); 
      setCustomerAddresses([]);
    }
  };

  const handleAddOrder = async () => {
    if (!addOrderModal || !newOrderForm.address || newOrderForm.items.length === 0) {
      return showWarning('Form Belum Lengkap', 'Silakan isi alamat penjemputan dan minimal tambahkan 1 item laundry.');
    }
    showLoading('Membuat Pesanan', 'Sedang menyimpan pesanan baru...');
    try {
      const res = await axios.post('/api/admin/orders/create', {
        customer_id: addOrderModal.id,
        address: newOrderForm.address,
        notes: newOrderForm.notes,
        service_speed: newOrderForm.service_speed,
        items: newOrderForm.items,
      }, { headers: getHeaders() });
      showSuccess('Order Berhasil', `Pesanan baru berhasil dibuat dengan Kode: ${res.data.order_code}`);
      setAddOrderModal(null);
      setNewOrderForm({ address: '', notes: '', service_speed: 'reguler', items: [{ service_type: 'kiloan', name: '' }] });
      fetchOrders();
    } catch (err) { showError('Gagal Tambah Order', err.response?.data?.message || err.response?.data?.error || 'Gagal menambahkan order baru.'); }
  };

  const validatePayment = async (oid) => {
    showLoading('Memvalidasi Pembayaran', 'Sedang memproses validasi bukti bayar...');
    try {
      await axios.put(`/api/admin/payments/validate/${oid}`, {}, { headers: getHeaders() });
      setOrders(prev => prev.map(o => o.id === oid ? { ...o, payment_status: 'paid' } : o));
      setPaymentModal(null);
      showSuccess('Validasi Berhasil', 'Bukti pembayaran pelanggan berhasil divalidasi!');
    } catch (err) {
      showError('Gagal Validasi', err.response?.data?.message || 'Gagal memvalidasi bukti bayar.');
    }
  };

  const assignCourier = async () => {
    if (!assignModal || !selectedCourier) return;
    showLoading('Menugaskan Kurir', 'Sedang memproses penugasan kurir...');
    try {
      await axios.put(`/api/admin/orders/${assignModal.orderId}/assign`, { courier_id: parseInt(selectedCourier) }, { headers: getHeaders() });
      showSuccess('Penugasan Berhasil', 'Kurir operasional berhasil ditugaskan untuk pesanan ini!');
      setAssignModal(null);
      setSelectedCourier('');
      fetchOrders();
    } catch (err) {
      showError('Penugasan Gagal', err.response?.data?.message || err.response?.data?.error || 'Gagal menugaskan kurir.');
    }
  };

  const editEstimasi = (orderId) => {
    const order = orders.find(o => o.id === orderId) || detailModal;
    setEditEstimasiModal({
      orderId,
      days: order?.estimated_days !== undefined ? order.estimated_days : 0,
      hours: order?.estimated_hours !== undefined ? order.estimated_hours : 0
    });
  };

  const submitEditEstimasi = async () => {
    if (!editEstimasiModal) return;
    const { orderId, days, hours } = editEstimasiModal;
    try {
      const order = orders.find(o => o.id === orderId) || detailModal;
      const payload = { estimated_days: parseInt(days) || 0, estimated_hours: parseInt(hours) || 0 };
      if (order && order.courier_id) payload.courier_id = order.courier_id;
      const res = await axios.put(`/api/admin/orders/${orderId}/assign`, payload, { headers: getHeaders() });
      
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, estimated_days: parseInt(days) || 0, estimated_hours: parseInt(hours) || 0, estimated_start: res.data.estimated_start || null }
        : o));
      
      setDetailModal(prev => prev && prev.id === orderId
        ? { ...prev, estimated_days: parseInt(days) || 0, estimated_hours: parseInt(hours) || 0, estimated_start: res.data.estimated_start || null }
        : prev);
      
      setEditEstimasiModal(null);
      showSuccess('Estimasi Diperbarui', 'Estimasi durasi pengerjaan laundry berhasil diperbarui!');
    } catch (err) {
      showError('Gagal Update Estimasi', err.response?.data?.message || err.response?.data?.error || 'Gagal memperbarui estimasi pengerjaan.');
    }
  };

  const handleTransferBranch = async () => {
    if (!branchModal || !selectedBranch) return;
    showLoading('Memindahkan Cabang', 'Sedang memproses pemindahan cabang pesanan...');
    try {
      await axios.put(`/api/admin/orders/${branchModal.orderId}/branch`, { branch_id: parseInt(selectedBranch) }, { headers: getHeaders() });
      showSuccess('Cabang Dipindahkan', 'Pesanan berhasil dipindahkan ke cabang baru.');
      setBranchModal(null);
      setSelectedBranch('');
      fetchOrders();
    } catch (err) {
      showError('Gagal Memindahkan', err.response?.data?.message || err.response?.data?.error || 'Gagal memindahkan cabang pesanan.');
    }
  };

  const openDetail = async (orderId) => {
    const res = await axios.get(`/api/admin/orders/${orderId}`, { headers: getHeaders() });
    setDetailModal(res.data);
  };

  const openPaymentModal = async (orderId) => {
    const res = await axios.get(`/api/admin/orders/${orderId}`, { headers: getHeaders() });
    setPaymentModal(res.data);
  };

  const openValidateModal = async (orderId) => {
    try {
      const res = await axios.get(`/api/admin/orders/${orderId}`, { headers: getHeaders() });
      const order = res.data;
      setValidateModal({
        ...order,
        admin_note: order.admin_note || '',
        additional_charge: order.additional_charge || 0,
        items: order.items.map(item => ({
          ...item,
          inputWeight: item.weight || 0,
          inputQty: item.qty_items || 0,
          manual_price: item.price_per_unit,
        })),
      });
    } catch { showError('Gagal Memuat Detail', 'Gagal memuat detail pesanan laundry.'); }
  };

  const handleValidateSubmit = async () => {
    if (!validateModal) return;
    const items = validateModal.items.map(item => {
      const isKiloan = (item.service_type || '').toLowerCase() === 'kiloan';
      return {
        item_id: item.id,
        weight: isKiloan ? item.inputWeight : undefined,
        qty: isKiloan ? undefined : item.inputQty,
        manual_price: item.manual_price,
      };
    });
    showLoading('Menyimpan Validasi', 'Sedang memproses berat & harga...');
    try {
      const res = await axios.put(
        `/api/admin/orders/${validateModal.id}/validate-items`,
        {
          items,
          admin_note: validateModal.admin_note,
          additional_charge: validateModal.additional_charge || 0
        },
        { headers: getHeaders() }
      );
      showSuccess('Validasi Berat/Harga', `Validasi berat & harga berhasil disimpan! Total Tagihan Baru: Rp ${Math.floor(res.data.total).toLocaleString('id-ID')}`);
      setValidateModal(null);
      fetchOrders();
    } catch (err) { showError('Validasi Gagal', err.response?.data?.message || 'Gagal menyimpan data validasi berat dan harga.'); }
  };

  /* ---------- STATISTIK ---------- */
  const today = new Date().toDateString();
  const ordersToday = orders.filter(o => new Date(o.created_at).toDateString() === today && o.status !== 'batal');
  const countToday = ordersToday.length;
  const revenueToday = ordersToday.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total_price || 0), 0);
  const activeOrders = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal').length;
  // Selesai hari ini = order yg statusnya selesai DAN dibuat hari ini
  const doneToday = orders.filter(o => o.status === 'selesai' && new Date(o.created_at).toDateString() === today).length;

  const calcPct = (now, prev) => {
    if (!prev && !now) return null;
    if (!prev) return now > 0 ? 100 : null;
    const pct = Math.round(((now - prev) / prev) * 100);
    return pct;
  };
  const pctOrders = yesterdayStats ? calcPct(countToday, Number(yesterdayStats.orders_yesterday)) : null;
  const pctActive = yesterdayStats ? calcPct(activeOrders, Number(yesterdayStats.active_yesterday)) : null;
  const pctDone = yesterdayStats ? calcPct(doneToday, Number(yesterdayStats.done_yesterday)) : null;
  const pctRevenue = yesterdayStats ? calcPct(revenueToday, Number(yesterdayStats.revenue_yesterday)) : null;

  const PctBadge = ({ pct }) => {
    if (pct === null || pct === undefined) return null;
    const up = pct >= 0;
    return (
      <span className="pct-badge" style={{
        display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.7rem', fontWeight: 700,
        color: up ? '#16a34a' : '#dc2626', background: up ? '#dcfce7' : '#fee2e2',
        borderRadius: 20, padding: '2px 7px', marginTop: 4
      }}>
        {up ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />}
        {Math.abs(pct)}% vs kemarin
      </span>
    );
  };

  /* ---------- FILTER ---------- */
  const checkIsOverdue = (o) => {
    if (o.status === 'selesai' || o.status === 'batal') return false;
    if (!o.estimated_days && !o.estimated_hours) return false;
    const start = o.estimated_start ? new Date(o.estimated_start) : new Date(o.created_at);
    const ms = ((o.estimated_days || 0) * 86400 + (o.estimated_hours || 0) * 3600) * 1000;
    return Date.now() > start.getTime() + ms;
  };

  const needWeightCount = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal' && (!o.total_price || o.total_price === 0)).length;
  const needPaymentCount = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal' && o.payment_proof && o.payment_status !== 'paid').length;
  const needCourierCount = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal' && !o.is_offline && !o.courier_id).length;
  const overdueCount = orders.filter(checkIsOverdue).length;

  const dynamicSubTabs = ['all_active'];
  if (overdueCount > 0) dynamicSubTabs.push('overdue');
  if (needWeightCount > 0) dynamicSubTabs.push('need_weight');
  if (needPaymentCount > 0) dynamicSubTabs.push('need_payment');
  if (needCourierCount > 0) dynamicSubTabs.push('need_courier');
  dynamicSubTabs.push(...statusOptions.filter(s => s !== 'batal'));

  const filteredOrders = orders.filter(o => {
    // Filter berdasarkan tab
    if (tab === 'order') {
      if (subTab === 'all_active') {
        if (o.status === 'selesai' || o.status === 'batal') return false;
      } else if (subTab === 'overdue') {
        if (!checkIsOverdue(o)) return false;
      } else if (subTab === 'need_weight') {
        if (o.status === 'selesai' || o.status === 'batal' || (o.total_price && o.total_price > 0)) return false;
      } else if (subTab === 'need_payment') {
        if (o.status === 'selesai' || o.status === 'batal' || !o.payment_proof || o.payment_status === 'paid') return false;
      } else if (subTab === 'need_courier') {
        if (o.status === 'selesai' || o.status === 'batal' || o.is_offline || o.courier_id) return false;
      } else {
        if (o.status !== subTab) return false;
      }
    }
    if (tab === 'riwayat' && o.status !== 'selesai' && o.status !== 'batal') return false;

    // Filter search
    const term = debouncedSearchTerm.toLowerCase();
    return (o.order_code?.toLowerCase().includes(term) || (o.customer_name || '').toLowerCase().includes(term));
  });

  const visibleOrders = (!showAll && tab === 'riwayat')
    ? filteredOrders.slice(0, 10)
    : filteredOrders;

  // Fungsi hitung jumlah per status
  const countByStatus = (s) => {
    if (s === 'all_active') return orders.filter(o => o.status !== 'selesai' && o.status !== 'batal').length;
    if (s === 'overdue') return overdueCount;
    if (s === 'need_weight') return needWeightCount;
    if (s === 'need_payment') return needPaymentCount;
    if (s === 'need_courier') return needCourierCount;
    return orders.filter(o => o.status === s).length;
  };

  /* ---------- FORMAT ---------- */
  const formatRupiah = (n) => 'Rp ' + Math.floor(Number(n) || 0).toLocaleString('id-ID');
  const formatDateTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };



  /* ---------- ACCORDION ---------- */
  const AccordionItem = ({ icon, label, children, hasContent }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="accordion-card">
        <div className="accordion-header" onClick={() => setOpen(!open)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{label}</span>
          <FiChevronDown 
            className={`accordion-chevron ${open ? 'open' : ''}`} 
            style={{ color: hasContent ? '#10b981' : '#3b82f6' }}
            strokeWidth={hasContent ? 3.5 : 2}
          />
        </div>
        {open && <div className="accordion-body">{children}</div>}
      </div>
    );
  };

  // Label untuk subtab
  const getSubTabLabel = (s) => {
    if (s === 'all_active') return 'Semua Aktif';
    if (s === 'overdue') return 'Overdue (Terlambat)';
    if (s === 'need_weight') return 'Butuh Validasi Berat';
    if (s === 'need_payment') return 'Butuh Validasi Pembayaran';
    if (s === 'need_courier') return 'Perlu Assign Kurir';
    return statusLabels[s];
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="admin-dashboard-clean">

      {/* Header */}
      {tab === 'order' && (
        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2>Manajemen Order</h2>
            <p>Kelola semua pesanan laundry masuk</p>
          </div>
          {isSuperAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-3)' }}>Filter Cabang:</span>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #e8eaf0',
                    background: 'white',
                    color: 'var(--navy)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    minWidth: '150px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMapPin /> {branchOptions.find(b => String(b.id) === String(selectedBranchFilter))?.name || 'Semua Cabang'}
                  </span>
                  <FiChevronDown style={{ 
                    transition: 'transform 0.2s', 
                    transform: isBranchDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' 
                  }} />
                </button>

                {isBranchDropdownOpen && (
                  <>
                    <div 
                      onClick={() => setIsBranchDropdownOpen(false)} 
                      style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--sh-lg)',
                        padding: '6px',
                        zIndex: 999,
                        minWidth: '180px',
                        animation: 'slideUp 0.15s ease-out'
                      }}
                    >
                      {branchOptions.map(b => {
                        const isSelected = String(b.id) === String(selectedBranchFilter);
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              window.triggerLoadingBar?.();
                              setSelectedBranchFilter(b.id);
                              setIsBranchDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 14px',
                              background: isSelected ? 'var(--sky-pale)' : 'transparent',
                              color: isSelected ? 'var(--blue)' : 'var(--text-2)',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              transition: 'background 0.15s'
                            }}
                            className="custom-dropdown-item"
                          >
                            <span>{b.name}</span>
                            {isSelected && <FiCheckCircle size={14} style={{ color: 'var(--blue)' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {tab === 'order' && (
        <div className="admin-summary-row">
          <div className="admin-summary-card">
            <div>
              <div className="admin-summary-value">{countToday}</div>
              <div className="admin-summary-label">Order Hari Ini</div>
              <PctBadge pct={pctOrders} />
            </div>
          </div>
          <div className="admin-summary-card">
            <div>
              <div className="admin-summary-value">{activeOrders}</div>
              <div className="admin-summary-label">Sedang Diproses</div>
              <PctBadge pct={pctActive} />
            </div>
          </div>
          <div className="admin-summary-card">
            <div>
              <div className="admin-summary-value">{doneToday}</div>
              <div className="admin-summary-label">Selesai Hari Ini</div>
              <PctBadge pct={pctDone} />
            </div>
          </div>
          <div className="admin-summary-card">
            <div>
              <div className="admin-summary-value" style={{ fontSize: '1.1rem' }}>{formatRupiah(revenueToday)}</div>
              <div className="admin-summary-label">Pendapatan Hari Ini</div>
              <PctBadge pct={pctRevenue} />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="admin-toolbar">
        {(tab === 'order' || tab === 'riwayat') && (
          <SearchBar 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Cari kode / nama pelanggan..." 
          />
        )}
      </div>

      {/* TAB LAPORAN */}
      {tab === 'laporan' && (
        <React.Suspense fallback={
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
            <FiClock style={{ fontSize: '2rem', animation: 'spin 2s linear infinite', marginBottom: 12 }} />
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Memuat Laporan Keuangan...</div>
          </div>
        }>
          <LaporanTab activeBranchId={isSuperAdmin ? selectedBranchFilter : user.branch_id} />
        </React.Suspense>
      )}

      {/* TAB FEEDBACK */}
      {tab === 'feedback' && (
        <FeedbackTab
          feedbacks={feedbacks}
          loading={feedbackLoading}
          onRefresh={fetchFeedbacks}
          onDeleteAll={handleDeleteAllFeedbacks}
          onDeleteOne={handleDeleteOneFeedback}
        />
      )}

      {/* Subtabs per status (DESKTOP ONLY) */}
      {tab === 'order' && (
        <div className="admin-subtabs desktop-only">
          {dynamicSubTabs.map(s => (
            <button key={s} className={`admin-subtab ${subTab === s ? 'active' : ''}`} onClick={() => { window.triggerLoadingBar?.(); setSubTab(s); }}>
              {getSubTabLabel(s)}
              {s !== 'selesai' && (
                <span style={{
                  marginLeft: 5,
                  background: (s === 'overdue' || s === 'need_weight' || s === 'need_payment' || s === 'need_courier') ? (subTab === s ? 'white' : '#ef4444') : (subTab === s ? 'rgba(255,255,255,0.3)' : 'var(--sky-faint)'),
                  color: (s === 'overdue' || s === 'need_weight' || s === 'need_payment' || s === 'need_courier') ? (subTab === s ? '#ef4444' : 'white') : (subTab === s ? 'white' : 'var(--navy)'),
                  borderRadius: 20, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700
                }}>
                  {countByStatus(s)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ====== TABEL DESKTOP ====== */}
      {(tab === 'order' || tab === 'riwayat') && (
        <div className="admin-table-card" style={{ marginTop: 12 }}>
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <div className="content-fade-in">
              <div className="table-responsive">
                <table className="admin-order-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Layanan</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                      <th>Pembayaran</th>
                      <th>Total</th>
                      <th>Validasi</th>
                      <th>Kurir</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.length === 0 ? (
                  <tr><td colSpan="10" className="empty-cell">Tidak ada order</td></tr>
                ) : visibleOrders.map((order, idx) => {
                  return (
                    <tr key={order.id}>
                      {/* Kolom Order */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="order-code" style={{ marginBottom: 0 }}>{order.order_code}</div>
                          {order.is_offline && <span style={{ padding: '2px 6px', background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', borderRadius: 4, fontWeight: 700, border: '1px solid #cbd5e1' }}>OFFLINE</span>}
                        </div>
                        <div className="customer-name">{order.customer_name || '-'}</div>
                        {order.phone && <div className="customer-phone">{order.phone}</div>}
                        {isSuperAdmin ? (
                          <div style={{ marginTop: 4 }}>
                            <button
                              onClick={() => {
                                setBranchModal({ orderId: order.id });
                                setSelectedBranch(order.branch_id || '');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#eff6ff',
                                color: '#1e40af',
                                border: '1.5px dashed #bfdbfe',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
                            >
                              <FiMapPin style={{ marginRight: '2px', display: 'inline-block', verticalAlign: 'middle', marginTop: '-3px' }} /> {order.branch_name || 'Set Cabang'} <FiEdit2 size={10} style={{ marginLeft: 2 }} />
                            </button>
                          </div>
                        ) : order.branch_name && (
                          <span style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe'
                          }}>
                            <FiMapPin style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle', marginTop: '-3px' }} /> {order.branch_name}
                          </span>
                        )}
                      </td>

                      {/* Kolom Layanan */}
                      <td>
                        <span className={`service-badge ${order.service_speed}`}>
                          {order.service_speed === 'express' ? <FiZap /> : <FiPackage />}
                          {formatServiceLabel(order)}
                        </span>
                        <div className="service-type">{order.service_types || [...new Set(order.items?.map(i => i.service_type) || [])].join(', ') || 'Kiloan'}</div>
                      </td>

                      {/* Kolom Tanggal */}
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        <div>{formatDateTime(order.created_at)}</div>
                        <SmallCountdown order={order} />
                      </td>

                      {/* Kolom Status */}
                      <td>
                        <div style={{ position: 'relative' }}>
                          <div
                            className="status-select"
                            onClick={() => {
                              if (activeStatusDropdownOrderId === order.id) {
                                setActiveStatusDropdownOrderId(null);
                              } else {
                                setActiveStatusDropdownOrderId(order.id);
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px',
                              padding: '6px 10px',
                              minWidth: '120px',
                              textTransform: 'capitalize'
                            }}
                          >
                            <span>{statusLabels[order.status]}</span>
                            <FiChevronDown style={{
                              transition: 'transform 0.2s',
                              transform: activeStatusDropdownOrderId === order.id ? 'rotate(180deg)' : 'rotate(0deg)'
                            }} />
                          </div>

                          {activeStatusDropdownOrderId === order.id && (
                            <div
                              className="modal-overlay"
                              onClick={() => setActiveStatusDropdownOrderId(null)}
                              style={{
                                zIndex: 9999,
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(15, 23, 42, 0.4)', // Slate backdrop
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div
                                className="modal-content"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  maxWidth: '380px',
                                  width: '90%',
                                  borderRadius: '16px',
                                  padding: '24px',
                                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                                  border: '1px solid #e2e8f0',
                                  background: 'white',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '16px',
                                  textAlign: 'left'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <FiEdit2 style={{ color: '#4f46e5' }} /> Ubah Status
                                    </h3>
                                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                      Order: <strong style={{ color: '#1e293b' }}>{order.order_code}</strong>
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setActiveStatusDropdownOrderId(null)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#94a3b8',
                                      fontSize: '1.1rem',
                                      padding: '4px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                                  >
                                    <FiX />
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {statusOptions.map(s => {
                                    const isSelected = order.status === s;
                                    return (
                                      <div
                                        key={s}
                                        onClick={() => {
                                          updateStatus(order.id, s);
                                          setActiveStatusDropdownOrderId(null);
                                        }}
                                        style={{
                                          padding: '12px 16px',
                                          borderRadius: '12px',
                                          cursor: 'pointer',
                                          fontSize: '0.9rem',
                                          color: isSelected ? '#fff' : '#334155',
                                          background: isSelected 
                                            ? 'linear-gradient(135deg, #4f46e5, #3730a3)' 
                                            : 'white',
                                          border: isSelected 
                                            ? '1px solid #4f46e5' 
                                            : '1px solid #e2e8f0',
                                          fontWeight: isSelected ? 700 : 500,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={e => {
                                          if (!isSelected) {
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                          }
                                        }}
                                        onMouseLeave={e => {
                                          if (!isSelected) {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                          }
                                        }}
                                      >
                                        <span style={{ textTransform: 'capitalize' }}>
                                          {statusLabels[s]}
                                        </span>
                                        {isSelected && (
                                          <span style={{ 
                                            background: 'rgba(255, 255, 255, 0.2)', 
                                            color: 'white', 
                                            fontSize: '0.72rem', 
                                            padding: '2px 8px', 
                                            borderRadius: '12px',
                                            fontWeight: 600
                                          }}>
                                            Aktif
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Kolom Pembayaran */}
                      <td>
                        {order.is_offline ? (
                          <select 
                            value={order.payment_status}
                            onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: order.payment_status === 'paid' ? '#dcfce7' : '#fee2e2', color: order.payment_status === 'paid' ? '#166534' : '#991b1b', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="paid">Lunas</option>
                            <option value="pending">Belum Lunas</option>
                          </select>
                        ) : order.payment_status === 'paid' ? (
                          <span className="badge-lunas"><FiCheckCircle /> Lunas</span>
                        ) : order.payment_proof ? (
                          <button className="btn-validasi" onClick={() => openPaymentModal(order.id)}>
                            <FiAlertCircle /> Validasi
                          </button>
                        ) : (
                          <span className="badge-belum-bayar">Belum Bayar</span>
                        )}
                      </td>


                      {/* Kolom Total */}
                      <td className="total-cell" style={{ whiteSpace: 'nowrap' }}>
                        {formatRupiah(order.total_price)}
                      </td>

                      {/* Kolom Validasi Berat */}
                      <td>
                        <button
                          className={`btn-validasi-berat ${order.total_price > 0 ? 'validated' : ''}`}
                          onClick={() => openValidateModal(order.id)}
                        >
                          {order.total_price > 0 ? <FiCheckCircle /> : <GiWeight />}
                          {order.total_price > 0 ? 'Edit' : 'Input'}
                        </button>
                      </td>

                      {/* Kolom Kurir */}
                      <td>
                        {order.is_offline ? (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>Tidak Tersedia</span>
                        ) : (
                          <div className="assign-action">
                            {order.courier_name ? (
                              <>
                                <span className="courier-name-label"><FiTruck /> {order.courier_name}</span>
                                <button className="btn-assign btn-sm" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(order.courier_id || ''); fetchCouriers(); }}>
                                  <FiEdit2 /> Ganti
                                </button>
                              </>
                            ) : (
                              <button className="btn-assign" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(''); fetchCouriers(); }}>
                                <FiUserPlus /> Assign
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Kolom Aksi */}
                      <td>
                        <button className="btn-detail" onClick={() => openDetail(order.id)}>
                          <FiEye /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!showAll && filteredOrders.length > visibleOrders.length && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAll(true)} style={{ width: '100%' }}>
                Lihat Semua ({filteredOrders.length})
              </button>
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {/* ====== MOBILE CARDS ====== */}
      {(tab === 'order' || tab === 'riwayat') && (
        <>
          {tab === 'order' && (
            <div className="admin-subtabs mobile-subtabs mobile-only">
              {dynamicSubTabs.map(s => (
                <button key={s} className={`admin-subtab ${subTab === s ? 'active' : ''}`} onClick={() => { window.triggerLoadingBar?.(); setSubTab(s); }}>
                  {getSubTabLabel(s)}
                  {s !== 'selesai' && (
                    <span style={{
                      marginLeft: 5,
                      background: (s === 'overdue' || s === 'need_weight' || s === 'need_payment' || s === 'need_courier') ? (subTab === s ? 'white' : '#ef4444') : (subTab === s ? 'rgba(255,255,255,0.3)' : 'var(--sky-faint)'),
                      color: (s === 'overdue' || s === 'need_weight' || s === 'need_payment' || s === 'need_courier') ? (subTab === s ? '#ef4444' : 'white') : (subTab === s ? 'white' : 'var(--navy)'),
                      borderRadius: 20, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700
                    }}>
                      {countByStatus(s)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="mobile-order-list">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton-card" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div className="skeleton" style={{ width: 120, height: 24 }} />
                      <div className="skeleton-text" style={{ width: 80 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <div className="skeleton" style={{ width: 100, height: 22, borderRadius: 20 }} />
                      <div className="skeleton" style={{ width: 120, height: 22, borderRadius: 20 }} />
                    </div>
                    <div className="skeleton-text" style={{ width: '60%', marginBottom: 12 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e5e7eb', paddingTop: 16 }}>
                      <div className="skeleton" style={{ width: 90, height: 24 }} />
                      <div className="skeleton" style={{ width: 70, height: 32 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}>Tidak ada order</div>
            ) : visibleOrders.map((order) => {
              return (
                <div key={order.id} className="mobile-order-card" style={{ position: 'relative' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div className="order-code" style={{ marginBottom: 0 }}>{order.order_code}</div>
                        {order.is_offline && <span style={{ padding: '2px 6px', background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', borderRadius: 4, fontWeight: 700, border: '1px solid #cbd5e1' }}>OFFLINE</span>}
                      </div>
                      <div className="customer-name">{order.customer_name}</div>
                      {order.phone && <div className="customer-phone">{order.phone}</div>}
                      {isSuperAdmin ? (
                        <div style={{ marginTop: 4 }}>
                          <button
                            onClick={() => {
                              setBranchModal({ orderId: order.id });
                              setSelectedBranch(order.branch_id || '');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1e40af',
                              border: '1.5px dashed #bfdbfe',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
                          >
                            <FiMapPin style={{ marginRight: '2px', display: 'inline-block', verticalAlign: 'middle', marginTop: '-3px' }} /> {order.branch_name || 'Set Cabang'} <FiEdit2 size={10} style={{ marginLeft: 2 }} />
                          </button>
                        </div>
                      ) : order.branch_name && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe'
                          }}>
                            <FiMapPin style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle', marginTop: '-3px' }} /> {order.branch_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div
                        className="status-select"
                        onClick={() => {
                          if (activeStatusDropdownOrderId === order.id) {
                            setActiveStatusDropdownOrderId(null);
                          } else {
                            setActiveStatusDropdownOrderId(order.id);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px',
                          padding: '6px 10px',
                          minWidth: '120px',
                          textTransform: 'capitalize'
                        }}
                      >
                        <span>{statusLabels[order.status]}</span>
                        <FiChevronDown style={{
                          transition: 'transform 0.2s',
                          transform: activeStatusDropdownOrderId === order.id ? 'rotate(180deg)' : 'rotate(0deg)'
                        }} />
                      </div>

                      {activeStatusDropdownOrderId === order.id && (
                        <div
                          className="modal-overlay"
                          onClick={() => setActiveStatusDropdownOrderId(null)}
                          style={{
                            zIndex: 9999,
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(15, 23, 42, 0.4)', // Slate backdrop
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              maxWidth: '380px',
                              width: '90%',
                              borderRadius: '16px',
                              padding: '24px',
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                              border: '1px solid #e2e8f0',
                              background: 'white',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FiEdit2 style={{ color: '#4f46e5' }} /> Ubah Status
                                </h3>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                  Order: <strong style={{ color: '#1e293b' }}>{order.order_code}</strong>
                                </p>
                              </div>
                              <button
                                onClick={() => setActiveStatusDropdownOrderId(null)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#94a3b8',
                                  fontSize: '1.1rem',
                                  padding: '4px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                              >
                                <FiX />
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {statusOptions.map(s => {
                                const isSelected = order.status === s;
                                return (
                                  <div
                                    key={s}
                                    onClick={() => {
                                      updateStatus(order.id, s);
                                      setActiveStatusDropdownOrderId(null);
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      borderRadius: '12px',
                                      cursor: 'pointer',
                                      fontSize: '0.9rem',
                                      color: isSelected ? '#fff' : '#334155',
                                      background: isSelected 
                                        ? 'linear-gradient(135deg, #4f46e5, #3730a3)' 
                                        : 'white',
                                      border: isSelected 
                                        ? '1px solid #4f46e5' 
                                        : '1px solid #e2e8f0',
                                      fontWeight: isSelected ? 700 : 500,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={e => {
                                      if (!isSelected) {
                                        e.currentTarget.style.background = '#f8fafc';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                      }
                                    }}
                                    onMouseLeave={e => {
                                      if (!isSelected) {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                      }
                                    }}
                                  >
                                    <span style={{ textTransform: 'capitalize' }}>
                                      {statusLabels[s]}
                                    </span>
                                    {isSelected && (
                                      <span style={{ 
                                        background: 'rgba(255, 255, 255, 0.2)', 
                                        color: 'white', 
                                        fontSize: '0.72rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px',
                                        fontWeight: 600
                                      }}>
                                        Aktif
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta badges */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span className={`service-badge ${order.service_speed}`}>
                      {order.service_speed === 'express' ? <FiZap /> : <FiPackage />}
                      {formatServiceLabel(order)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', alignSelf: 'center' }}>
                      {order.service_types || [...new Set(order.items?.map(i => i.service_type) || [])].join(', ') || 'Kiloan'}
                    </span>
                  </div>

                  {/* Info rows */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Tanggal</span>
                    <div style={{ textAlign: 'right' }}>
                      <div>{formatDateTime(order.created_at)}</div>
                      <SmallCountdown order={order} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: '0.82rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)' }}>Pembayaran</span>
                    <span>
                      {order.is_offline ? (
                        <select 
                          value={order.payment_status}
                          onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: order.payment_status === 'paid' ? '#dcfce7' : '#fee2e2', color: order.payment_status === 'paid' ? '#166534' : '#991b1b', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="paid">Lunas</option>
                          <option value="pending">Belum Lunas</option>
                        </select>
                      ) : order.payment_status === 'paid' ? (
                        <span className="badge-lunas"><FiCheckCircle /> Lunas</span>
                      ) : order.payment_proof ? (
                        <button className="btn-validasi" onClick={() => openPaymentModal(order.id)}>
                          <FiAlertCircle /> Validasi
                        </button>
                      ) : (
                        <span className="badge-belum-bayar">Belum Bayar</span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Total</span>
                    <span className="total-cell">{formatRupiah(order.total_price)}</span>
                  </div>


                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <button
                      className={`btn-validasi-berat ${order.total_price > 0 ? 'validated' : ''}`}
                      onClick={() => openValidateModal(order.id)}
                    >
                      {order.total_price > 0 ? <FiCheckCircle /> : <GiWeight />} Validasi
                    </button>

                    {order.is_offline ? (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600, background: '#f8fafc', padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>Tidak Tersedia</span>
                    ) : order.courier_name ? (
                      <button className="btn-assign" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(order.courier_id || ''); fetchCouriers(); }}>
                        <FiTruck /> {order.courier_name}
                      </button>
                    ) : (
                      <button className="btn-assign" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(''); fetchCouriers(); }}>
                        <FiUserPlus /> Assign Kurir
                      </button>
                    )}

                    <button className="btn-detail" onClick={() => openDetail(order.id)}>
                      <FiEye /> Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ====== MODAL VALIDASI PEMBAYARAN ====== */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="detail-header">
              <h3><FiCreditCard style={{ marginRight: 8 }} /> Validasi Pembayaran</h3>
              <button className="btn-close" onClick={() => setPaymentModal(null)}><FiX /></button>
            </div>
            <div className="detail-section">
              <div style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Order</span><strong>{paymentModal.order_code}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Pelanggan</span><span>{paymentModal.customer_name}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Total</span><strong style={{ color: 'var(--navy)' }}>{formatRupiah(paymentModal.total_price)}</strong></div>
              </div>
            </div>
            {paymentModal.payment_proof ? (
              <>
                <img
                  src={resolveFileUrl(paymentModal.payment_proof)}
                  alt="Bukti Pembayaran"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 12, marginBottom: 12, border: '1px solid var(--border)' }}
                />
                {paymentModal.payment_date && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-4)', textAlign: 'center', marginBottom: 12 }}>
                    Diunggah: {formatDateTime(paymentModal.payment_date)}
                  </p>
                )}
                <button className="btn" style={{ width: '100%' }} onClick={() => validatePayment(paymentModal.id)}>
                  <FiCheckCircle /> Validasi Pembayaran
                </button>
              </>
            ) : (
              <p style={{ color: 'var(--text-4)', textAlign: 'center', padding: '20px 0' }}>
                Belum ada bukti pembayaran.
              </p>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setPaymentModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL ASSIGN KURIR ====== */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3>Assign Kurir</h3>
              <button className="btn-close" onClick={() => setAssignModal(null)}><FiX /></button>
            </div>
            <div style={{ position: 'relative', marginTop: 12 }}>
              <div
                onClick={() => setCourierDropdownOpen(!courierDropdownOpen)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.9rem',
                  color: '#1e293b',
                  height: '42px',
                  boxSizing: 'border-box'
                }}
              >
                <span>
                  {selectedCourier
                    ? couriers.find(c => String(c.id) === String(selectedCourier))?.name || 'Kurir terpilih'
                    : '-- Pilih Kurir --'}
                </span>
                <FiChevronDown style={{
                  color: '#64748b',
                  transition: 'transform 0.2s',
                  transform: courierDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }} />
              </div>

              {courierDropdownOpen && (
                <>
                  <div
                    onClick={() => setCourierDropdownOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 998,
                      background: 'transparent'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0, right: 0,
                      background: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
                      zIndex: 999,
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    <div
                      onClick={() => {
                        setSelectedCourier('');
                        setCourierDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: !selectedCourier ? '#fff' : '#1e293b',
                        background: !selectedCourier ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                        fontWeight: !selectedCourier ? 700 : 500,
                        transition: 'all 0.1s'
                      }}
                      onMouseEnter={e => {
                        if (selectedCourier) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={e => {
                        if (selectedCourier) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      -- Pilih Kurir --
                    </div>
                    {couriers.map(c => {
                      const isSelected = String(selectedCourier) === String(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCourier(c.id);
                            setCourierDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: isSelected ? '#fff' : '#1e293b',
                            background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                            fontWeight: isSelected ? 700 : 500,
                            transition: 'all 0.1s'
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {c.name} ({c.phone || c.email})
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {couriers.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-4)', marginTop: 8 }}>Memuat daftar kurir...</p>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Batal</button>
              <button className="btn" onClick={assignCourier} disabled={!selectedCourier}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL DETAIL ORDER ====== */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="detail-header">
              <h3>Detail Order</h3>
              <button className="btn-close" onClick={() => setDetailModal(null)}><FiX /></button>
            </div>

            {/* Info Pesanan */}
            <div className="detail-section">
              <h4>Informasi Pesanan</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Pelanggan</div>
                  <div className="detail-value" style={{ fontWeight: 600 }}>{detailModal.customer_name}</div>
                </div>
                {detailModal.branch_name && (
                  <div className="detail-item">
                    <div className="detail-label">Cabang</div>
                    <div className="detail-value" style={{ fontWeight: 600, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiMapPin /> {detailModal.branch_name}
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <div className="detail-label">No. HP</div>
                  <div className="detail-value">{detailModal.phone || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    <span className={`status-pill status-${detailModal.status}`}>{statusLabels[detailModal.status]}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Layanan</div>
                  <div className="detail-value">
                    {detailModal.service_speed === 'express' ? <FiZap /> : <FiPackage />}
                    {' '}{formatServiceLabel(detailModal)}
                    {detailModal.service_types ? ` · ${detailModal.service_types}` : ''}
                  </div>
                </div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="detail-label">Alamat</div>
                  <div className="detail-value">{detailModal.address || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Tanggal Order</div>
                  <div className="detail-value">{formatDateTime(detailModal.created_at)}</div>
                </div>
                {(detailModal.status === 'selesai' || detailModal.status === 'batal') && (
                  <div className="detail-item">
                    <div className="detail-label">{detailModal.status === 'batal' ? 'Dibatalkan Pada' : 'Selesai/Diterima'}</div>
                    <div className="detail-value">{formatDateTime(detailModal.updated_at)}</div>
                  </div>
                )}
                <div className="detail-item">
                  <div className="detail-label">Total</div>
                  <div className="detail-value" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {formatRupiah(detailModal.total_price)}
                  </div>
                </div>
              </div>

              {/* Tombol WA + Maps */}
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {detailModal.phone && (
                  <a
                    href={`https://wa.me/${formatWA(detailModal.phone)}?text=${encodeURIComponent(getDynamicWAMessage(detailModal))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm"
                    style={{ background: '#25d366', color: 'white', boxShadow: 'none' }}
                  >
                    <FiPhone /> WA Pelanggan
                  </a>
                )}
                {detailModal.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailModal.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-secondary"
                  >
                    <FiMapPin /> Lihat di Maps
                  </a>
                )}
              </div>
              {/* Info Voucher */}
              {detailModal.voucher_code && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', border: '1px solid #fde68a' }}>
                  <FiTag style={{ color: '#b45309' }} />
                  <span>Menggunakan Voucher: <strong style={{ color: '#b45309' }}>{detailModal.voucher_name || detailModal.voucher_code}</strong></span>
                </div>
              )}
              {/* Catatan Pelanggan untuk Admin */}
              {detailModal.notes && (
                <div style={{ marginTop: 12, padding: '12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}><FiClipboard className="icon-inline" /> Catatan Pesanan (dari Pelanggan)</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', whiteSpace: 'pre-wrap' }}>{detailModal.notes}</div>
                </div>
              )}
              {/* Catatan Tambahan Admin */}
              {detailModal.admin_note && (
                <div style={{ marginTop: 8, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan Tambahan (Admin)</div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{detailModal.admin_note}</div>
                </div>
              )}
            </div>

            {/* Tabel Item */}
            {detailModal.items?.length > 0 && (
              <div className="detail-section">
                <h4>Detail Item</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="invoice-table">
                    <thead>
                      <tr><th>Layanan</th><th>Nama</th><th>Catatan</th><th>Jumlah</th><th>Satuan</th><th>Parfum</th><th>Harga</th></tr>
                    </thead>
                    <tbody>
                      {detailModal.items.map(item => {
                        const qty = item.service_type === 'kiloan' ? item.weight : item.qty_items;
                        const unit = item.service_type === 'kiloan' ? 'kg' : 'pcs';
                        const subtotal = item.service_type === 'kiloan'
                          ? (item.weight || 0) * (item.price_per_unit || 7000)
                          : (item.qty_items || 0) * (item.price_per_unit || 5000);
                        return (
                          <tr key={item.id}>
                            <td>{item.service_type}</td>
                            <td>{item.name || '-'}</td>
                            <td style={{ color: 'var(--red)', fontWeight: 600 }}>{item.notes || '-'}</td>
                            <td>{qty}</td>
                            <td>{unit}</td>
                            <td>{item.parfum || '-'}</td>
                            <td>{formatRupiah(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal</td>
                        <td>{formatRupiah(detailModal.total_price - (detailModal.additional_charge || 0) - (detailModal.express_fee || 0))}</td>
                      </tr>
                      {detailModal.additional_charge !== 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'right', fontWeight: 600, color: detailModal.additional_charge < 0 ? '#ef4444' : 'inherit' }}>
                            {detailModal.additional_charge < 0 ? 'Potongan / Diskon' : 'Biaya Tambahan'}
                          </td>
                          <td style={{ color: detailModal.additional_charge < 0 ? '#ef4444' : 'inherit', fontWeight: 600 }}>
                            {detailModal.additional_charge < 0 ? `-${formatRupiah(Math.abs(detailModal.additional_charge))}` : formatRupiah(detailModal.additional_charge)}
                          </td>
                        </tr>
                      )}
                      {detailModal.express_fee > 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'right', fontWeight: 600 }}>Biaya Express</td>
                          <td>{formatRupiah(detailModal.express_fee)}</td>
                        </tr>
                      )}
                      {detailModal.voucher_name && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>Voucher Terpakai</td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>{detailModal.voucher_name}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>Total Akhir</td>
                        <td style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>{formatRupiah(detailModal.total_price)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Dokumentasi accordion */}
            <div className="detail-section">
              <h4>Dokumentasi</h4>
              {[
                { label: 'Foto Barang', key: 'photo_url', icon: <FiCamera /> },
                { label: 'Bukti Pembayaran', key: 'payment_proof', icon: <FiFileText /> },
                { label: 'Foto Serah Terima', key: 'delivery_proof', icon: <FiTruck /> },
              ].map(item => (
                <AccordionItem key={item.key} icon={item.icon} label={item.label} hasContent={!!detailModal[item.key]}>
                  {detailModal[item.key] ? (
                    <img src={resolveFileUrl(detailModal[item.key])} alt={item.label} style={{ maxWidth: '100%', borderRadius: 10 }} />
                  ) : (
                    <p style={{ color: 'var(--text-4)', fontSize: '0.875rem' }}>Belum tersedia</p>
                  )}
                </AccordionItem>
              ))}
            </div>

            {/* Estimasi Pengerjaan */}
            <div className="detail-section">
              <h4>Estimasi Pengerjaan</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: 12 }}>
                <EstimasiCell order={detailModal} onEdit={editEstimasi} formatDateTime={formatDateTime} />
              </div>
            </div>

            <ReceiptDownloader order={detailModal} />

            <button className="btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => setDetailModal(null)}>Tutup</button>
          </div>
        </div>
      )}

      {/* ====== MODAL VALIDASI BERAT & HARGA ====== */}
      {validateModal && (
        <div className="modal-overlay" onClick={() => setValidateModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="detail-header">
              <h3>Validasi Berat & Harga</h3>
              <button className="btn-close" onClick={() => setValidateModal(null)}><FiX /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 16 }}>
              Order: <strong>{validateModal.order_code}</strong><br />
              Layanan: <strong>{formatServiceLabel(validateModal)}</strong>
              {validateModal.voucher_code && (
                <><br />Voucher: <strong style={{ color: '#10b981' }}>{validateModal.voucher_name || validateModal.voucher_code}</strong></>
              )}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="invoice-table">
                <thead>
                  <tr><th>Item</th><th>Tipe</th><th>Berat / Jumlah</th><th>Harga Satuan</th></tr>
                </thead>
                <tbody>
                  {validateModal.items.map(item => (
                    <tr key={item.id}>
                      <td>{item.name || '-'}</td>
                      <td>{item.service_type}</td>
                      <td>
                        {item.service_type === 'kiloan' ? (
                          <input
                            type="number" min="0" step="0.1"
                            value={item.inputWeight}
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              let val = e.target.value;
                              if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                              setValidateModal(prev => ({
                                ...prev,
                                items: prev.items.map(i => i.id === item.id ? { ...i, inputWeight: val === '' ? '' : (parseFloat(val) || 0) } : i),
                              }));
                            }}
                            style={{ width: 80 }}
                          />
                        ) : (
                          <input
                            type="number" min="1"
                            value={item.inputQty}
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              let val = e.target.value;
                              if (val.length > 1 && val.startsWith('0')) val = val.replace(/^0+/, '');
                              setValidateModal(prev => ({
                                ...prev,
                                items: prev.items.map(i => i.id === item.id ? { ...i, inputQty: val === '' ? '' : (parseInt(val) || 0) } : i),
                              }));
                            }}
                            style={{ width: 80 }}
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="number" min="0"
                          value={item.manual_price}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            let val = e.target.value;
                            if (val.length > 1 && val.startsWith('0')) val = val.replace(/^0+/, '');
                            setValidateModal(prev => ({
                              ...prev,
                              items: prev.items.map(i => i.id === item.id ? { ...i, manual_price: val === '' ? '' : (parseInt(val) || 0) } : i),
                            }));
                          }}
                          style={{ width: 100 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Biaya Tambahan (Opsional)</div>
                <input
                  type="number"
                  value={validateModal.additional_charge || ''}
                  placeholder="Contoh: -5000"
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const val = e.target.value;
                    setValidateModal(prev => ({ ...prev, additional_charge: val }));
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Catatan/Penjelasan Biaya (Opsional)</div>
                <textarea
                  value={validateModal.admin_note || ''}
                  onChange={e => setValidateModal(prev => ({ ...prev, admin_note: e.target.value }))}
                  placeholder="Misal: Baju luntur dipisah, charge setrika jas..."
                  style={{ width: '100%', minHeight: 38, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Live Preview Estimated Total */}
            <div style={{
              marginTop: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Estimasi Total Baru:</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                Rp {(() => {
                  let sub = 0;
                  validateModal.items.forEach(item => {
                    const isKiloan = (item.service_type || '').toLowerCase() === 'kiloan';
                    const w = parseFloat(item.inputWeight) || 0;
                    const qty = parseInt(item.inputQty) || 0;
                    const price = parseInt(item.manual_price) || 0;
                    sub += isKiloan ? (w * price) : (qty * price);
                  });
                  return Math.round(sub + (parseInt(validateModal.additional_charge) || 0)).toLocaleString('id-ID');
                })()}
              </span>
            </div>

            <div className="modal-footer" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setValidateModal(null)}>Batal</button>
              <button className="btn" onClick={handleValidateSubmit}><FiCheckCircle /> Simpan & Hitung</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL SELESAIKAN (Admin) ====== */}
      {completeModal && (
        <div className="modal-overlay" onClick={() => setCompleteModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="detail-header">
              <h3><FiCheckCircle style={{ color: 'var(--green)', marginRight: 8 }} />Selesaikan Pesanan</h3>
              <button className="btn-close" onClick={() => setCompleteModal(null)}><FiX /></button>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginBottom: 16 }}>
              Tandai pesanan ini sebagai <strong>selesai</strong>. Upload foto bukti serah terima (opsional).
            </p>
              <PhotoUploader
                photo={completePhoto}
                onPhoto={setCompletePhoto}
              />
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCompleteModal(null)}>Batal</button>
              <button className="btn" onClick={handleCompleteOrder}><FiCheckCircle /> Selesaikan</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB PENGGUNA ====== */}
      {tab === 'users' && (
        <div style={{ marginTop: 12 }}>
          <div className="admin-table-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiUsers style={{ color: 'var(--blue)' }} />
              <strong style={{ color: 'var(--navy)' }}>Daftar Pengguna</strong>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-3)' }}>{customers.length} customer terdaftar</span>
            </div>
            <div className="table-responsive">
              <table className="admin-order-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Telepon</th>
                    <th>Total Order</th>
                    <th>Order Terakhir</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr><td colSpan="5" className="empty-cell">Belum ada customer</td></tr>
                  ) : customers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sky-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--blue)', fontSize: '0.85rem' }}>
                            {c.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{c.phone || '-'}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.total_orders}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-4)', marginLeft: 4 }}>order</span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                        {c.last_order_at ? formatDateTime(c.last_order_at) : '-'}
                      </td>
                      <td>
                        <button className="btn-detail" onClick={() => openCustomerDetail(c)}>
                          <FiEye /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ====== MOBILE USERS CARD LIST ====== */}
          <div className="mobile-users-list">
            {customers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}>Belum ada customer</div>
            ) : customers.map(c => (
              <div key={c.id} className="mobile-user-card">
                <div className="mobile-user-avatar">{c.name?.[0]?.toUpperCase()}</div>
                <div className="mobile-user-info">
                  <div className="mobile-user-name">{c.name}</div>
                  <div className="mobile-user-phone">{c.phone || '-'}</div>
                  <div className="mobile-user-meta">
                    <span className="mobile-user-badge">{c.total_orders} order</span>
                    {c.last_order_at && (
                      <span className="mobile-user-badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                        {formatDateTime(c.last_order_at)}
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn-detail" onClick={() => openCustomerDetail(c)}>
                  <FiEye />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== TAB BANTUAN ====== */}
      {tab === 'bantuan' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Bantuan */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            padding: '24px 28px',
            borderRadius: 16,
            color: 'white',
            boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.15)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiHelpCircle style={{ color: '#38bdf8' }} /> Pusat Panduan &amp; Kontak Bantuan
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, maxWidth: 650 }}>
              Selamat datang di pusat bantuan sistem operasional Alinea Laundry. Gunakan halaman ini untuk mengakses panduan penyelesaian kasus di lapangan dan direktori kontak resmi cabang.
            </p>
          </div>

          {/* Row 1: Direktori Staf */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Cabang Sampangan */}
            <div style={{
              background: 'white',
              borderRadius: 14,
              border: '1.5px solid #e2e8f0',
              padding: 18,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cabang Sampangan</span>
                  <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    {bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 1).length} Admin
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 1).length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Tidak ada admin terdaftar di cabang ini</div>
                  ) : (
                    bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 1).map(admin => (
                      <div key={admin.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{admin.name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{admin.phone || admin.email}</div>
                        </div>
                        {admin.phone && (
                          <a
                            href={`https://wa.me/${formatWA(admin.phone)}?text=Halo%20Admin%20Sampangan%20${encodeURIComponent(admin.name)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#22c55e', color: 'white', border: 'none', borderRadius: 8,
                              padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, display: 'flex',
                              alignItems: 'center', gap: 4, textDecoration: 'none'
                            }}
                          >
                            <FiMessageCircle /> Chat
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Cabang Unnes */}
            <div style={{
              background: 'white',
              borderRadius: 14,
              border: '1.5px solid #e2e8f0',
              padding: 18,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cabang Unnes</span>
                  <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    {bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 2).length} Admin
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 2).length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Tidak ada admin terdaftar di cabang ini</div>
                  ) : (
                    bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 2).map(admin => (
                      <div key={admin.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{admin.name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{admin.phone || admin.email}</div>
                        </div>
                        {admin.phone && (
                          <a
                            href={`https://wa.me/${formatWA(admin.phone)}?text=Halo%20Admin%20Unnes%20${encodeURIComponent(admin.name)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#22c55e', color: 'white', border: 'none', borderRadius: 8,
                              padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, display: 'flex',
                              alignItems: 'center', gap: 4, textDecoration: 'none'
                            }}
                          >
                            <FiMessageCircle /> Chat
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Cabang Tlogosari */}
            <div style={{
              background: 'white',
              borderRadius: 14,
              border: '1.5px solid #e2e8f0',
              padding: 18,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cabang Tlogosari</span>
                  <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    {bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 3).length} Admin
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 3).length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Tidak ada admin terdaftar di cabang ini</div>
                  ) : (
                    bantuanDirectory.filter(u => u.role === 'admin' && u.branch_id === 3).map(admin => (
                      <div key={admin.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{admin.name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{admin.phone || admin.email}</div>
                        </div>
                        {admin.phone && (
                          <a
                            href={`https://wa.me/${formatWA(admin.phone)}?text=Halo%20Admin%20Tlogosari%20${encodeURIComponent(admin.name)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#22c55e', color: 'white', border: 'none', borderRadius: 8,
                              padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, display: 'flex',
                              alignItems: 'center', gap: 4, textDecoration: 'none'
                            }}
                          >
                            <FiMessageCircle /> Chat
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Tim Kurir */}
            <div style={{
              background: 'white',
              borderRadius: 14,
              border: '1.5px solid #e2e8f0',
              padding: 18,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tim Staf Kurir</span>
                  <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                    {bantuanDirectory.filter(u => u.role === 'courier').length} Staf
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bantuanDirectory.filter(u => u.role === 'courier').length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Tidak ada kurir terdaftar saat ini</div>
                  ) : (
                    bantuanDirectory.filter(u => u.role === 'courier').map(courier => (
                      <div key={courier.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{courier.name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{courier.phone || courier.email}</div>
                        </div>
                        {courier.phone && (
                          <a
                            href={`https://wa.me/${formatWA(courier.phone)}?text=Halo%20Kurir%20Alinea%20${encodeURIComponent(courier.name)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#22c55e', color: 'white', border: 'none', borderRadius: 8,
                              padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700, display: 'flex',
                              alignItems: 'center', gap: 4, textDecoration: 'none'
                            }}
                          >
                            <FiMessageCircle /> Chat
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SOP & Kasus Operasional */}
          <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Standard Operating Procedure (SOP) &amp; Penanganan Kasus</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 20 }}>Daftar panduan lengkap penanganan kondisi khusus yang sering terjadi dalam operasional laundry harian.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Accordion 1: Website Down */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveFaq(activeFaq === 1 ? null : 1)}
                  style={{
                    width: '100%', padding: '14px 18px', background: activeFaq === 1 ? '#f8fafc' : 'white',
                    border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    Kasus 1: Sistem Aplikasi / Database down lambat tidak merespons
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', transition: 'transform 0.2s', transform: activeFaq === 1 ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </button>
                {activeFaq === 1 && (
                  <div style={{ padding: '16px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                    Apabila aplikasi atau database tidak merespons pengerjaan di dasbor, ikuti langkah berikut:<br />
                    1. Pastikan koneksi internet di cabang dalam keadaan stabil dan periksa koneksi data seluler.<br />
                    2. Lakukan log out dari sistem, bersihkan cache browser, lalu coba log in kembali.<br />
                    3. Gunakan pencatatan nota transaksi secara manual pada buku fisik cabang sementara waktu untuk mengamankan data cucian masuk.<br />
                    4. Segera laporkan kendala ke administrator pusat atau hubungi staf IT pendukung agar status database server Supabase/Vercel dapat dicek.
                  </div>
                )}
              </div>

              {/* Accordion 2: Kurir Sedang Tidur */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveFaq(activeFaq === 2 ? null : 2)}
                  style={{
                    width: '100%', padding: '14px 18px', background: activeFaq === 2 ? '#f8fafc' : 'white',
                    border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    Kasus 2: Staf kurir sedang tidur tidak merespons penugasan pickup/antar
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', transition: 'transform 0.2s', transform: activeFaq === 2 ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </button>
                {activeFaq === 2 && (
                  <div style={{ padding: '16px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                    Apabila kurir yang telah ditugaskan (assigned courier) tidak merespons atau terlambat melakukan pickup/delivery sesuai estimasi pengerjaan:<br />
                    1. Admin berwenang untuk melakukan penugasan ulang kurir (Re-assign).<br />
                    2. Masuk ke halaman dasbor utama pada tab Manajemen Order, cari kode pesanan bersangkutan.<br />
                    3. Pada kolom "Kurir", klik tombol "Ganti", pilih nama kurir aktif cadangan lain yang sedang bertugas di lapangan.<br />
                    4. Klik tombol "Assign" untuk memperbarui penugasan, dan kurir baru akan langsung menerima notifikasi pengambilan di handphone mereka.
                  </div>
                )}
              </div>

              {/* Accordion 3: Bukti Bayar Buram */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveFaq(activeFaq === 3 ? null : 3)}
                  style={{
                    width: '100%', padding: '14px 18px', background: activeFaq === 3 ? '#f8fafc' : 'white',
                    border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    Kasus 3: Bukti transfer pembayaran tidak terbaca buram palsu
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', transition: 'transform 0.2s', transform: activeFaq === 3 ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </button>
                {activeFaq === 3 && (
                  <div style={{ padding: '16px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                    Apabila bukti transfer yang diunggah pelanggan tidak terbaca jelas atau dicurigai palsu:<br />
                    1. JANGAN klik validasi pembayaran terlebih dahulu agar status tagihan tidak berubah menjadi lunas.<br />
                    2. Buka pesanan bersangkutan, lalu klik tombol "Detail".<br />
                    3. Klik tombol hijau "WA Pelanggan" untuk terhubung ke obrolan WhatsApp secara langsung.<br />
                    4. Minta pelanggan secara ramah untuk mengirimkan ulang foto bukti transfer pembayaran yang asli dan dapat terbaca jelas.<br />
                    5. Setelah bukti yang valid diterima di WhatsApp, admin dapat mengonfirmasi transaksi dan memvalidasi pembayaran di sistem dasbor.
                  </div>
                )}
              </div>

              {/* Accordion 4: Pakaian Rusak */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveFaq(activeFaq === 4 ? null : 4)}
                  style={{
                    width: '100%', padding: '14px 18px', background: activeFaq === 4 ? '#f8fafc' : 'white',
                    border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    Kasus 4: Klaim pakaian pelanggan rusak tertukar hilang
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', transition: 'transform 0.2s', transform: activeFaq === 4 ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </button>
                {activeFaq === 4 && (
                  <div style={{ padding: '16px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                    Apabila pelanggan mengajukan klaim atas kerusakan atau kehilangan barang cucian:<br />
                    1. Segera lakukan pencarian transaksi terkait di tab "Riwayat" berdasarkan nama pelanggan atau kode order.<br />
                    2. Periksa detail order untuk melihat catatan pengerjaan khusus serta foto barang masuk jika didokumentasikan.<br />
                    3. Hubungi manajer cabang bersangkutan untuk melakukan penelusuran fisik di area pengerjaan cucian.<br />
                    4. Jika terbukti terjadi kesalahan operasional di pihak laundry, lakukan penyelesaian ganti rugi sesuai ketentuan (maksimal sebesar sepuluh kali lipat dari tarif layanan satuan/kiloan item yang diklaim) secara kekeluargaan.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alur Kerja Sistem */}
          <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Alur Pengerjaan Sistem (Standard Order Lifecycle)</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 20 }}>Penjelasan tahapan alur data pesanan laundry dari masuk hingga selesai untuk pemahaman alur kerja operasional.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { step: 'Tahap 1', title: 'Input Order Pelanggan', desc: 'Pelanggan membuat pesanan melalui web dengan memilih opsi reguler atau express, serta menginput detail jemput dan jenis pewangi parfum yang diinginkan.' },
                { step: 'Tahap 2', title: 'Penugasan Kurir (Assign)', desc: 'Admin menerima pesanan baru di dasbor dan menugaskan kurir terdekat. Staf kurir menjemput pakaian kotor dan memperbarui status pesanan menjadi dijemput (pickup).' },
                { step: 'Tahap 3', title: 'Input Berat &amp; Validasi Tagihan', desc: 'Setelah pakaian kotor tiba di cabang, admin menimbang secara riil berat pakaian dan menginput berat tersebut ke dalam sistem. Sistem secara otomatis menghitung harga total yang harus dibayarkan.' },
                { step: 'Tahap 4', title: 'Proses Cuci &amp; Pembayaran', desc: 'Pakaian mulai diproses cuci, setrika, atau lipat. Pelanggan melakukan pembayaran transfer bank dan mengunggah buktinya. Admin melakukan verifikasi bukti transfer untuk mengubah status menjadi Lunas.' },
                { step: 'Tahap 5', title: 'Pengantaran &amp; Selesai', desc: 'Pakaian yang telah bersih diserahkan kepada kurir untuk diantarkan kembali. Kurir menyerahkan pakaian bersih ke pelanggan, mengunggah foto serah terima, dan menandai transaksi selesai.' }
              ].map((flow, index) => (
                <div key={index} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    background: '#e0e7ff', color: '#4338ca', fontWeight: 800, fontSize: '0.75rem',
                    padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', minWidth: 65, textAlign: 'center'
                  }}>
                    {flow.step}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{flow.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{flow.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL DETAIL CUSTOMER ====== */}
      {customerModal && (
        <div className="modal-overlay" onClick={() => setCustomerModal(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="detail-header">
              <h3><FiUser style={{ marginRight: 8 }} />{customerModal.name}</h3>
              <button className="btn-close" onClick={() => setCustomerModal(null)}><FiX /></button>
            </div>
            <div className="detail-section">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Telepon</div>
                  <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {customerModal.phone || '-'}
                    {customerModal.phone && (
                      <a
                        href={`https://wa.me/${formatWA(customerModal.phone)}`}
                        target="_blank" rel="noreferrer"
                        className="btn btn-sm"
                        style={{ background: '#25D366', color: 'white', padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                      >
                        <FiMessageCircle /> WA
                      </a>
                    )}
                  </div>
                </div>
                <div className="detail-item"><div className="detail-label">Total Order</div><div className="detail-value" style={{ fontWeight: 700, color: 'var(--blue)' }}>{customerModal.total_orders} order</div></div>
              </div>

              {customerAddresses && customerAddresses.length > 0 && (
                <div className="detail-item" style={{ marginTop: 12, background: 'var(--sky-faint)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
                  <div className="detail-label">Alamat Tersimpan ({customerAddresses.length})</div>
                  <div className="detail-value">
                    <ul style={{ paddingLeft: 16, margin: '4px 0 0', fontSize: '0.85rem' }}>
                      {customerAddresses.map((addr) => (
                        <li key={addr.id} style={{ marginBottom: 4 }}>
                          <strong>{addr.label || 'Rumah'}</strong> — {addr.address}
                          {addr.note && <span style={{ color: 'var(--text-3)' }}> ({addr.note})</span>}
                          {addr.is_primary && <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '2px 4px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>UTAMA</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => { setAddOrderModal(customerModal); setNewOrderForm({ address: '', notes: '', service_speed: 'reguler', items: [{ service_type: 'kiloan', name: '' }] }); }}>
                <FiPlus /> Tambah Order
              </button>
            </div>
            <div className="detail-section">
              <h4>Riwayat Order</h4>
              {customerOrders.length === 0 ? (
                <p style={{ color: 'var(--text-4)', fontSize: '0.85rem' }}>Belum ada order</p>
              ) : (
                <table className="invoice-table">
                  <thead><tr><th>Kode</th><th>Tanggal</th><th>Status</th><th>Total</th></tr></thead>
                  <tbody>
                    {customerOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.82rem' }}>{o.order_code}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{formatDateTime(o.created_at)}</td>
                        <td><span className={`status-pill status-${o.status}`}>{statusLabels[o.status]}</span></td>
                        <td style={{ fontWeight: 600 }}>{formatRupiah(o.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setCustomerModal(null)}>Tutup</button>
          </div>
        </div>
      )}

      {/* ====== MODAL TAMBAH ORDER (Admin) ====== */}
      {addOrderModal && (
        <div className="modal-overlay" onClick={() => setAddOrderModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="detail-header">
              <h3><FiPlus style={{ marginRight: 8 }} />Tambah Order — {addOrderModal.name}</h3>
              <button className="btn-close" onClick={() => setAddOrderModal(null)}><FiX /></button>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Alamat Penjemputan *</label>
                <input className="form-input" placeholder="Alamat lengkap" value={newOrderForm.address} onChange={e => setNewOrderForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Kecepatan Layanan</label>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      setSpeedDropdownOpen(!speedDropdownOpen);
                      setActiveModalItemTypeIndex(null);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1.5px solid #e2e8f0',
                      background: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.9rem',
                      color: '#1e293b',
                      height: '38px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{newOrderForm.service_speed}</span>
                    <FiChevronDown style={{
                      color: '#64748b',
                      transition: 'transform 0.2s',
                      transform: speedDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }} />
                  </div>

                  {speedDropdownOpen && (
                    <>
                      <div
                        onClick={() => setSpeedDropdownOpen(false)}
                        style={{
                          position: 'fixed',
                          top: 0, left: 0, right: 0, bottom: 0,
                          zIndex: 998,
                          background: 'transparent'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0, right: 0,
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.08)',
                          zIndex: 999,
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        {[
                          { value: 'reguler', label: 'Reguler' },
                          { value: 'express', label: 'Express' }
                        ].map(opt => {
                          const isSelected = newOrderForm.service_speed === opt.value;
                          return (
                            <div
                              key={opt.value}
                              onClick={() => {
                                setNewOrderForm(p => ({ ...p, service_speed: opt.value }));
                                setSpeedDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: isSelected ? '#fff' : '#1e293b',
                                background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                fontWeight: isSelected ? 700 : 500,
                                transition: 'all 0.1s'
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {opt.label}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Item Cucian</label>
                {newOrderForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <div style={{ position: 'relative', flex: '0 0 120px' }}>
                      <div
                        onClick={() => {
                          if (activeModalItemTypeIndex === idx) {
                            setActiveModalItemTypeIndex(null);
                          } else {
                            setActiveModalItemTypeIndex(idx);
                            setSpeedDropdownOpen(false);
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1.5px solid #e2e8f0',
                          background: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.9rem',
                          color: '#1e293b',
                          height: '38px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ textTransform: 'capitalize' }}>{item.service_type}</span>
                        <FiChevronDown style={{
                          color: '#64748b',
                          transition: 'transform 0.2s',
                          transform: activeModalItemTypeIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)'
                        }} />
                      </div>

                      {activeModalItemTypeIndex === idx && (
                        <>
                          <div
                            onClick={() => setActiveModalItemTypeIndex(null)}
                            style={{
                              position: 'fixed',
                              top: 0, left: 0, right: 0, bottom: 0,
                              zIndex: 998,
                              background: 'transparent'
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              left: 0, right: 0,
                              background: 'white',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.08)',
                              zIndex: 999,
                              padding: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            {[
                              { value: 'kiloan', label: 'Kiloan' },
                              { value: 'satuan', label: 'Satuan' }
                            ].map(opt => {
                              const isSelected = item.service_type === opt.value;
                              return (
                                <div
                                  key={opt.value}
                                  onClick={() => {
                                    const items = [...newOrderForm.items];
                                    items[idx].service_type = opt.value;
                                    setNewOrderForm(p => ({ ...p, items }));
                                    setActiveModalItemTypeIndex(null);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    color: isSelected ? '#fff' : '#1e293b',
                                    background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                    fontWeight: isSelected ? 700 : 500,
                                    transition: 'all 0.1s'
                                  }}
                                  onMouseEnter={e => {
                                    if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                                  }}
                                  onMouseLeave={e => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  {opt.label}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                    <input className="form-input" placeholder="Nama item" value={item.name} onChange={e => { const items = [...newOrderForm.items]; items[idx].name = e.target.value; setNewOrderForm(p => ({ ...p, items })); }} style={{ height: '38px' }} />
                    {newOrderForm.items.length > 1 && <button className="btn btn-sm btn-secondary" onClick={() => setNewOrderForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}>✕</button>}
                  </div>
                ))}
                <button className="btn btn-sm btn-secondary" onClick={() => setNewOrderForm(p => ({ ...p, items: [...p.items, { service_type: 'kiloan', name: '' }] }))}><FiPlus /> Tambah Item</button>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Catatan</label>
                <textarea className="form-input" rows={2} placeholder="Catatan untuk kurir..." value={newOrderForm.notes} onChange={e => setNewOrderForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddOrderModal(null)}>Batal</button>
              <button className="btn" onClick={handleAddOrder}><FiPlus /> Buat Order</button>
            </div>
          </div>
        </div>
      )}
      {editEstimasiModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%', borderRadius: '16px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)' }}>Edit Estimasi Waktu</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Estimasi Hari</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  placeholder="0"
                  value={editEstimasiModal.days}
                  onChange={e => setEditEstimasiModal(p => ({ ...p, days: e.target.value }))}
                  style={{ height: '42px', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Estimasi Jam</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="23"
                  placeholder="0"
                  value={editEstimasiModal.hours}
                  onChange={e => setEditEstimasiModal(p => ({ ...p, hours: e.target.value }))}
                  style={{ height: '42px', fontSize: '0.95rem' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setEditEstimasiModal(null)}>Batal</button>
              <button className="btn" onClick={submitEditEstimasi}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pindah Cabang */}
      {branchModal && (
        <div className="modal-overlay" onClick={() => setBranchModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', width: '90%', borderRadius: '16px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <FiMapPin style={{ color: 'var(--blue)' }} /> Pindahkan Cabang
              </h3>
              <button onClick={() => setBranchModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', margin: 0 }}>
                Pilih cabang tujuan untuk memindahkan pesanan ini:
              </p>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="" disabled>-- Pilih Cabang --</option>
                {branchOptions.filter(b => b.id !== '').map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setBranchModal(null)}>Batal</button>
              <button
                className="btn"
                onClick={handleTransferBranch}
                disabled={!selectedBranch}
                style={{ background: 'linear-gradient(135deg, var(--blue), var(--navy))' }}
              >
                Pindahkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;