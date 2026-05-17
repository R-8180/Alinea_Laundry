import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import {
  FiPackage, FiClock, FiCheckCircle, FiDollarSign, FiSearch, FiAlertCircle,
  FiUserPlus, FiChevronDown, FiPhone, FiCamera, FiFileText, FiMapPin,
  FiTruck, FiEdit2, FiX, FiEye, FiUsers, FiTag, FiArrowUp, FiArrowDown,
  FiPlus, FiUser, FiMessageCircle, FiZap, FiCreditCard
} from 'react-icons/fi';
import { GiWeight } from 'react-icons/gi';
import LaporanTab from './LaporanTab';

/* ---------- KONSTANTA ---------- */
const statusLabels = { menunggu: 'Menunggu', pickup: 'Dijemput', cuci: 'Dicuci', antar: 'Diantar', selesai: 'Selesai', batal: 'Dibatalkan' };

// Helper: resolve file URL for both old local paths and new Supabase URLs
const resolveFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Old local path like /uploads/xxx — prefix with API base
  const base = process.env.REACT_APP_API_URL || '';
  return `${base}${url}`;
};

const statusOptions = ['menunggu', 'pickup', 'cuci', 'antar', 'selesai', 'batal'];
// Tambah 'all_active' di paling depan

const formatWA = (phone) => {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) return clean;
  return clean.startsWith('0') ? '62' + clean.slice(1) : '62' + clean;
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
    if (!order || order.status === 'selesai') { setRemaining(''); return; }
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
          {countdown && order.status !== 'selesai' && (
            <div style={{ fontSize: '0.72rem', color: countdown === 'Selesai' ? 'var(--green)' : '#ef4444', fontWeight: 700 }}>
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

/* ================================================================
   ADMIN DASHBOARD
   ================================================================ */
const AdminDashboard = () => {
  const location = useLocation();

  const getTabFromUrl = () => {
    const t = new URLSearchParams(location.search).get('tab');
    if (t === 'laporan') return 'laporan';
    if (t === 'riwayat') return 'riwayat';
    if (t === 'users') return 'users';
    return 'order';
  };

  /* ---------- STATE ---------- */
  const [orders, setOrders] = useState([]);
  const [tab, setTabState] = useState(getTabFromUrl);
  // Default subtab sekarang 'all_active'
  const [subTab, setSubTab] = useState('all_active');
  const [loading, setLoading] = useState(true);
  const [validateModal, setValidateModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [completePhoto, setCompletePhoto] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [yesterdayStats, setYesterdayStats] = useState(null);
  // Users tab state
  const [customers, setCustomers] = useState([]);
  const [customerModal, setCustomerModal] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [addOrderModal, setAddOrderModal] = useState(null);
  const [newOrderForm, setNewOrderForm] = useState({ address: '', notes: '', service_speed: 'reguler', items: [{ service_type: 'kiloan', name: '' }] });
  const [couriers, setCouriers] = useState([]);
  const token = localStorage.getItem('token');
  const h = { Authorization: `Bearer ${token}` };


  useEffect(() => { setTabState(getTabFromUrl()); }, [location.search]); // eslint-disable-line

  /* ---------- FETCH ---------- */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/orders', { headers: h });
      setOrders(res.data);
    } catch { alert('Gagal memuat data order'); } finally { setLoading(false); }
  }, []); // eslint-disable-line

  const fetchYesterdayStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/stats/yesterday', { headers: h });
      setYesterdayStats(res.data);
    } catch {}
  }, []); // eslint-disable-line

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/customers', { headers: h });
      setCustomers(res.data || []);
    } catch (err) {
      console.error('fetchCustomers error:', err.response?.data || err.message);
      setCustomers([]);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchOrders(); fetchYesterdayStats(); }, [fetchOrders, fetchYesterdayStats]);
  useEffect(() => { if (tab === 'users') fetchCustomers(); }, [tab, fetchCustomers]);

  /* ---------- HANDLERS ---------- */
  const fetchCouriers = async () => {
    try {
      const res = await axios.get('/api/admin/couriers', { headers: h });
      setCouriers(res.data || []);
    } catch (err) {
      console.error('fetchCouriers error:', err);
      setCouriers([]);
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
      const yakin = window.confirm('⚠️ Yakin ingin membatalkan pesanan ini?\nTindakan ini tidak dapat dibatalkan.');
      if (!yakin) return;
    }
    await axios.put(`/api/admin/orders/${id}/status`, { status: newStatus }, { headers: h });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    fetchCustomers(); // update riwayat pengguna saat status berubah
  };

  const handleCompleteOrder = async () => {
    if (!completeModal) return;
    try {
      if (completePhoto) {
        // Jika ada foto, kirim sebagai FormData (multipart)
        const fd = new FormData();
        fd.append('photo', completePhoto);
        await axios.put(`/api/admin/orders/${completeModal.orderId}/complete`, fd, {
          headers: { ...h, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Jika tanpa foto, kirim JSON biasa
        await axios.put(`/api/admin/orders/${completeModal.orderId}/complete`, {}, {
          headers: h
        });
      }
      setCompleteModal(null);
      setCompletePhoto(null);
      // Refresh semua data agar summary cards & tab Pengguna ikut update
      await fetchOrders();
      await fetchYesterdayStats();
      fetchCustomers(); // selalu refresh agar riwayat pengguna ikut update
      alert('Pesanan berhasil diselesaikan');
    } catch (err) { 
      console.error('Complete error:', err.response?.data);
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal menyelesaikan pesanan'); 
    }
  };

  const openCustomerDetail = async (customer) => {
    setCustomerModal(customer);
    try {
      const res = await axios.get(`/api/admin/customers/${customer.id}/orders`, { headers: h });
      setCustomerOrders(res.data);
    } catch { setCustomerOrders([]); }
  };

  const handleAddOrder = async () => {
    if (!addOrderModal || !newOrderForm.address || newOrderForm.items.length === 0) {
      return alert('Isi alamat dan minimal 1 item');
    }
    try {
      const res = await axios.post('/api/admin/orders/create', {
        customer_id: addOrderModal.id,
        address: newOrderForm.address,
        notes: newOrderForm.notes,
        service_speed: newOrderForm.service_speed,
        items: newOrderForm.items,
      }, { headers: h });
      alert(`Order berhasil: ${res.data.order_code}`);
      setAddOrderModal(null);
      setNewOrderForm({ address: '', notes: '', service_speed: 'reguler', items: [{ service_type: 'kiloan', name: '' }] });
      fetchOrders();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.error || 'Gagal menambah order'); }
  };

  const validatePayment = async (oid) => {
    await axios.put(`/api/admin/payments/validate/${oid}`, {}, { headers: h });
    setOrders(prev => prev.map(o => o.id === oid ? { ...o, payment_status: 'paid' } : o));
    setPaymentModal(null);
    alert('Validasi pembayaran berhasil');
  };

  const assignCourier = async () => {
    if (!assignModal || !selectedCourier) return;
    try {
      await axios.put(`/api/admin/orders/${assignModal.orderId}/assign`, { courier_id: parseInt(selectedCourier) }, { headers: h });
      alert('Kurir berhasil diassign');
      setAssignModal(null);
      setSelectedCourier('');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal assign kurir');
    }
  };

  const editEstimasi = async (orderId) => {
    const daysInput = prompt('Estimasi hari:\n(kosongkan untuk 0)');
    if (daysInput === null) return;
    const hoursInput = prompt('Estimasi jam:\n(kosongkan untuk 0)');
    if (hoursInput === null) return;
    const days = daysInput === '' ? 0 : parseInt(daysInput) || 0;
    const hours = hoursInput === '' ? 0 : parseInt(hoursInput) || 0;
    try {
      const order = orders.find(o => o.id === orderId);
      const payload = { estimated_days: days, estimated_hours: hours };
      if (order.courier_id) payload.courier_id = order.courier_id;
      const res = await axios.put(`/api/admin/orders/${orderId}/assign`, payload, { headers: h });
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, estimated_days: days, estimated_hours: hours, estimated_start: res.data.estimated_start || null }
        : o));
      setDetailModal(prev => prev && prev.id === orderId 
        ? { ...prev, estimated_days: days, estimated_hours: hours, estimated_start: res.data.estimated_start || null }
        : prev);
      alert('Estimasi diupdate');
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.error || 'Gagal update estimasi'); }
  };

  const openDetail = async (orderId) => {
    const res = await axios.get(`/api/admin/orders/${orderId}`, { headers: h });
    setDetailModal(res.data);
  };

  const openPaymentModal = async (orderId) => {
    const res = await axios.get(`/api/admin/orders/${orderId}`, { headers: h });
    setPaymentModal(res.data);
  };

  const openValidateModal = async (orderId) => {
    try {
      const res = await axios.get(`/api/admin/orders/${orderId}`, { headers: h });
      const order = res.data;
      setValidateModal({
        ...order,
        admin_note: order.admin_note || '',
        items: order.items.map(item => ({
          ...item,
          inputWeight: item.weight || 0,
          inputQty: item.qty_items || 0,
          manual_price: item.price_per_unit,
        })),
      });
    } catch { alert('Gagal memuat detail order'); }
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
    try {
      const res = await axios.put(`/api/admin/orders/${validateModal.id}/validate-items`, { items, admin_note: validateModal.admin_note }, { headers: h });
      alert(`Total baru: Rp ${Math.floor(res.data.total).toLocaleString('id-ID')}`);
      setValidateModal(null);
      fetchOrders();
    } catch (err) { alert(err.response?.data?.message || 'Gagal menyimpan validasi'); }
  };

  /* ---------- STATISTIK ---------- */
  const today = new Date().toDateString();
  const ordersToday = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const countToday = ordersToday.length;
  const revenueToday = ordersToday.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total_price || 0), 0);
  const activeOrders = orders.filter(o => o.status !== 'selesai').length;
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
      <span className="pct-badge" style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:'0.7rem', fontWeight:700,
        color: up ? '#16a34a' : '#dc2626', background: up ? '#dcfce7' : '#fee2e2',
        borderRadius:20, padding:'2px 7px', marginTop:4 }}>
        {up ? <FiArrowUp size={10}/> : <FiArrowDown size={10}/>}
        {Math.abs(pct)}% vs kemarin
      </span>
    );
  };

  /* ---------- FILTER ---------- */
  const needWeightCount = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal' && (!o.total_price || o.total_price === 0)).length;
  const needPaymentCount = orders.filter(o => o.status !== 'selesai' && o.status !== 'batal' && o.payment_proof && o.payment_status !== 'paid').length;

  const dynamicSubTabs = ['all_active'];
  if (needWeightCount > 0) dynamicSubTabs.push('need_weight');
  if (needPaymentCount > 0) dynamicSubTabs.push('need_payment');
  dynamicSubTabs.push(...statusOptions.filter(s => s !== 'batal'));

  const filteredOrders = orders.filter(o => {
    // Filter berdasarkan tab
    if (tab === 'order') {
      if (subTab === 'all_active') {
        if (o.status === 'selesai' || o.status === 'batal') return false;
      } else if (subTab === 'need_weight') {
        if (o.status === 'selesai' || o.status === 'batal' || (o.total_price && o.total_price > 0)) return false;
      } else if (subTab === 'need_payment') {
        if (o.status === 'selesai' || o.status === 'batal' || !o.payment_proof || o.payment_status === 'paid') return false;
      } else {
        if (o.status !== subTab) return false;
      }
    }
    if (tab === 'riwayat' && o.status !== 'selesai' && o.status !== 'batal') return false;
    
    // Filter search
    const term = searchTerm.toLowerCase();
    return (o.order_code?.toLowerCase().includes(term) || (o.customer_name || '').toLowerCase().includes(term));
  });
  
  const visibleOrders = (!showAll && tab === 'riwayat')
    ? filteredOrders.slice(0, 10)
    : filteredOrders;
  
  // Fungsi hitung jumlah per status
  const countByStatus = (s) => {
    if (s === 'all_active') return orders.filter(o => o.status !== 'selesai' && o.status !== 'batal').length;
    if (s === 'need_weight') return needWeightCount;
    if (s === 'need_payment') return needPaymentCount;
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
  const AccordionItem = ({ icon, label, children }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="accordion-card">
        <div className="accordion-header" onClick={() => setOpen(!open)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{label}</span>
          <FiChevronDown className={`accordion-chevron ${open ? 'open' : ''}`} />
        </div>
        {open && <div className="accordion-body">{children}</div>}
      </div>
    );
  };

  // Label untuk subtab
  const getSubTabLabel = (s) => {
    if (s === 'all_active') return 'Semua Aktif';
    if (s === 'need_weight') return 'Butuh Validasi Berat';
    if (s === 'need_payment') return 'Butuh Validasi Pembayaran';
    return statusLabels[s];
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="admin-dashboard-clean">

      {/* Header */}
      {tab === 'order' && (
        <div className="admin-header">
          <h2>Manajemen Order</h2>
          <p>Kelola semua pesanan laundry masuk</p>
        </div>
      )}

      {/* Summary Cards */}
      {tab === 'order' && (
        <div className="admin-summary-row">
          <div className="admin-summary-card">
            <div className="admin-summary-icon" style={{ background: 'var(--sky-faint)', color: 'var(--blue)' }}><FiPackage /></div>
            <div>
              <div className="admin-summary-value">{countToday}</div>
              <div className="admin-summary-label">Order Hari Ini</div>
              <PctBadge pct={pctOrders} />
            </div>
          </div>
          <div className="admin-summary-card">
            <div className="admin-summary-icon" style={{ background: '#fef3c7', color: '#b45309' }}><FiClock /></div>
            <div>
              <div className="admin-summary-value">{activeOrders}</div>
              <div className="admin-summary-label">Sedang Diproses</div>
              <PctBadge pct={pctActive} />
            </div>
          </div>
          <div className="admin-summary-card">
            <div className="admin-summary-icon" style={{ background: 'var(--green-light)', color: 'var(--green)' }}><FiCheckCircle /></div>
            <div>
              <div className="admin-summary-value">{doneToday}</div>
              <div className="admin-summary-label">Selesai Hari Ini</div>
              <PctBadge pct={pctDone} />
            </div>
          </div>
          <div className="admin-summary-card">
            <div className="admin-summary-icon" style={{ background: 'var(--sky-pale)', color: 'var(--navy-60)' }}><FiDollarSign /></div>
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
          <div className="admin-search">
            <FiSearch />
            <input type="text" placeholder="Cari kode / nama pelanggan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>

      {/* TAB LAPORAN */}
      {tab === 'laporan' && <LaporanTab />}

      {/* Subtabs per status (DESKTOP ONLY) */}
      {tab === 'order' && (
        <div className="admin-subtabs desktop-only">
          {dynamicSubTabs.map(s => (
            <button key={s} className={`admin-subtab ${subTab === s ? 'active' : ''}`} onClick={() => setSubTab(s)}>
              {getSubTabLabel(s)}
              <span style={{ 
                marginLeft:5, 
                background: (s === 'need_weight' || s === 'need_payment') ? (subTab===s ? 'white' : '#ef4444') : (subTab===s ? 'rgba(255,255,255,0.3)' : 'var(--sky-faint)'), 
                color: (s === 'need_weight' || s === 'need_payment') ? (subTab===s ? '#ef4444' : 'white') : (subTab===s ? 'white' : 'var(--navy)'), 
                borderRadius:20, padding:'1px 7px', fontSize:'0.72rem', fontWeight:700 
              }}>
                {countByStatus(s)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ====== TABEL DESKTOP ====== */}
      {(tab === 'order' || tab === 'riwayat') && (
        <div className="admin-table-card" style={{ marginTop: 12 }}>
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
                {loading ? (
                  <tr><td colSpan="10" className="empty-cell"><FiClock style={{marginRight: 4}} /> Memuat data…</td></tr>
                ) : visibleOrders.length === 0 ? (
                  <tr><td colSpan="10" className="empty-cell">Tidak ada order</td></tr>
                ) : visibleOrders.map(order => (
                  <tr key={order.id}>
                    {/* Kolom Order */}
                    <td>
                      <div className="order-code">{order.order_code}</div>
                      <div className="customer-name">{order.customer_name || '-'}</div>
                      {order.phone && <div className="customer-phone">{order.phone}</div>}
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
                      {formatDateTime(order.created_at)}
                    </td>

                    {/* Kolom Status */}
                    <td>
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        className="status-select"
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </td>

                    {/* Kolom Pembayaran */}
                    <td>
                      {order.payment_status === 'paid' ? (
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
                      <div className="assign-action">
                        {order.courier_name ? (
                          <>
                            <span className="courier-name-label"><FiTruck /> {order.courier_name}</span>
                            <button className="btn-assign btn-sm" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(order.courier_id || ''); fetchCouriers(); }}}>
                              <FiEdit2 /> Ganti
                            </button>
                          </>
                        ) : (
                          <button className="btn-assign" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(''); fetchCouriers(); }}}>
                            <FiUserPlus /> Assign
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Kolom Aksi */}
                    <td>
                      <button className="btn-detail" onClick={() => openDetail(order.id)}>
                        <FiEye /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* ====== MOBILE CARDS ====== */}
      {(tab === 'order' || tab === 'riwayat') && (
        <>
          {tab === 'order' && (
            <div className="admin-subtabs mobile-subtabs mobile-only">
              {dynamicSubTabs.map(s => (
                <button key={s} className={`admin-subtab ${subTab === s ? 'active' : ''}`} onClick={() => setSubTab(s)}>
                  {getSubTabLabel(s)}
                  <span style={{ 
                    marginLeft:5, 
                    background: (s === 'need_weight' || s === 'need_payment') ? (subTab===s ? 'white' : '#ef4444') : (subTab===s ? 'rgba(255,255,255,0.3)' : 'var(--sky-faint)'), 
                    color: (s === 'need_weight' || s === 'need_payment') ? (subTab===s ? '#ef4444' : 'white') : (subTab===s ? 'white' : 'var(--navy)'), 
                    borderRadius:20, padding:'1px 7px', fontSize:'0.72rem', fontWeight:700 
                  }}>
                    {countByStatus(s)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mobile-order-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}><FiClock style={{marginRight: 4}} /> Memuat…</div>
          ) : visibleOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}>Tidak ada order</div>
          ) : visibleOrders.map(order => (
            <div key={order.id} className="mobile-order-card" style={{ position: 'relative', overflow: 'hidden' }}>
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
                  {order.phone && <div className="customer-phone">{order.phone}</div>}
                </div>
                <select
                  value={order.status}
                  onChange={e => updateStatus(order.id, e.target.value)}
                  className="status-select"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
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
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: '0.82rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-3)' }}>Pembayaran</span>
                <span>
                  {order.payment_status === 'paid' ? (
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

                {order.courier_name ? (
                  <button className="btn-assign" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(order.courier_id || ''); fetchCouriers(); }}}>
                    <FiTruck /> {order.courier_name}
                  </button>
                ) : (
                  <button className="btn-assign" onClick={() => { setAssignModal({ orderId: order.id }); setSelectedCourier(''); fetchCouriers(); }}}>
                    <FiUserPlus /> Assign Kurir
                  </button>
                )}

                <button className="btn-detail" onClick={() => openDetail(order.id)}>
                  <FiEye /> Detail
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* ====== MODAL VALIDASI PEMBAYARAN ====== */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="detail-header">
              <h3><FiCreditCard style={{marginRight: 8}} /> Validasi Pembayaran</h3>
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
            <select value={selectedCourier} onChange={e => setSelectedCourier(e.target.value)} className="form-select" style={{ marginTop: 12 }}>
              <option value="">-- Pilih Kurir --</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email})</option>
              ))}
            </select>
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
                    href={`https://wa.me/${formatWA(detailModal.phone)}?text=${encodeURIComponent(`Halo ${detailModal.customer_name}, pesanan Anda ${detailModal.order_code} sedang diproses.`)}`}
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
                  <span>Menggunakan Voucher: <strong style={{ color: '#b45309' }}>{detailModal.voucher_code}</strong></span>
                </div>
              )}
              {/* Catatan Admin */}
              {detailModal.admin_note && (
                <div style={{ marginTop: 12, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1' }}>
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
                      <tr><th>Layanan</th><th>Nama</th><th>Jumlah</th><th>Satuan</th><th>Parfum</th><th>Harga</th></tr>
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
                        <td colSpan="5" style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                        <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{formatRupiah(detailModal.total_price)}</td>
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
                <AccordionItem key={item.key} icon={item.icon} label={item.label}>
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

            <button className="btn" style={{ width: '100%' }} onClick={() => setDetailModal(null)}>Tutup</button>
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
                <><br />Voucher: <strong style={{ color: '#10b981' }}>{validateModal.voucher_code} (Diskon {validateModal.discount || 0}%)</strong></>
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
                              if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.substring(1);
                              setValidateModal(prev => ({
                                ...prev,
                                items: prev.items.map(i => i.id === item.id ? { ...i, inputWeight: parseFloat(val) || 0 } : i),
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
                              if (val.length > 1 && val.startsWith('0')) val = val.substring(1);
                              setValidateModal(prev => ({
                                ...prev,
                                items: prev.items.map(i => i.id === item.id ? { ...i, inputQty: parseInt(val) || 0 } : i),
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
                              if (val.length > 1 && val.startsWith('0')) val = val.substring(1);
                              setValidateModal(prev => ({
                                ...prev,
                                items: prev.items.map(i => i.id === item.id ? { ...i, manual_price: parseInt(val) || 0 } : i),
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
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>Catatan Tambahan (Opsional)</div>
              <textarea 
                value={validateModal.admin_note || ''} 
                onChange={e => setValidateModal(prev => ({ ...prev, admin_note: e.target.value }))}
                placeholder="Misal: Baju luntur dipisah, atau berat timbangan beda..."
                style={{ width: '100%', minHeight: 60, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>
            <div className="modal-footer">
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
            <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16 }}>
              <FiCamera style={{ fontSize: '1.5rem', color: 'var(--text-4)', marginBottom: 6 }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-4)', marginBottom: 8 }}>Foto bukti serah terima (opsional)</p>
              <input type="file" accept="image/*" onChange={e => setCompletePhoto(e.target.files[0])} style={{ fontSize: '0.8rem' }} />
              {completePhoto && <p style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><FiCheckCircle /> {completePhoto.name}</p>}
            </div>
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
              
              {(() => {
                const addresses = [...new Set(customerOrders.filter(o => o.address).map(o => o.address))];
                if (addresses.length > 0) {
                  return (
                    <div className="detail-item" style={{ marginTop: 12, background: 'var(--sky-faint)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
                      <div className="detail-label">Alamat Disimpan ({addresses.length})</div>
                      <div className="detail-value">
                        <ul style={{ paddingLeft: 16, margin: '4px 0 0', fontSize: '0.85rem' }}>
                          {addresses.map((addr, idx) => (
                            <li key={idx} style={{ marginBottom: 4 }}>{addr}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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
                <select className="form-select" value={newOrderForm.service_speed} onChange={e => setNewOrderForm(p => ({ ...p, service_speed: e.target.value }))}>
                  <option value="reguler">Reguler</option>
                  <option value="express">Express</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Item Cucian</label>
                {newOrderForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <select className="form-select" style={{ flex: '0 0 120px' }} value={item.service_type} onChange={e => { const items = [...newOrderForm.items]; items[idx].service_type = e.target.value; setNewOrderForm(p => ({ ...p, items })); }}>
                      <option value="kiloan">Kiloan</option>
                      <option value="satuan">Satuan</option>
                    </select>
                    <input className="form-input" placeholder="Nama item" value={item.name} onChange={e => { const items = [...newOrderForm.items]; items[idx].name = e.target.value; setNewOrderForm(p => ({ ...p, items })); }} />
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

    </div>
  );
};

export default AdminDashboard;