import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showSuccess, showError } from '../utils/swal';
import {
  FiPackage, FiCheckCircle, FiFileText, FiCamera, FiCopy,
  FiTruck, FiChevronDown, FiArrowLeft, FiInfo, FiMessageCircle, FiZap, FiMapPin
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import ReceiptDownloader from '../components/ReceiptDownloader';

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
  menunggu: 'Menunggu Jemput',
  pickup: 'Sedang Dijemput',
  proses: 'Diproses',
  antar: 'Menunggu Diantar',
  sedang_diantar: 'Sedang Diantar',
  selesai: 'Selesai',
  batal: 'Dibatalkan'
};

const formatWA = (phone) => {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('62')) return clean;
  return clean.startsWith('0') ? '62' + clean.slice(1) : '62' + clean;
};

const AccordionItem = ({ icon, label, children, hasContent }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="accordion-card">
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <span className="accordion-title"><span style={{ marginRight: 8 }}>{icon}</span>{label}</span>
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

const HistoryCardSkeleton = () => (
  <div className="skeleton-card" style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <div className="skeleton" style={{ width: 130, height: 24 }} />
      <div className="skeleton-text" style={{ width: 90 }} />
    </div>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <div className="skeleton" style={{ width: 110, height: 22 }} />
      <div className="skeleton" style={{ width: 80, height: 22 }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px dashed #e5e7eb' }}>
      <div className="skeleton" style={{ width: 90, height: 24 }} />
      <div className="skeleton" style={{ width: 70, height: 32 }} />
    </div>
  </div>
);

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data.filter(o => ['selesai', 'batal'].includes(o.status)));
    } catch (err) {
      console.error('Gagal ambil riwayat:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (orderId) => {
    try {
      const res = await axios.get(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      setDetailModal(res.data);
    } catch (err) {
      showError('Gagal Memuat', 'Gagal memuat detail pesanan laundry.');
    }
  };

  const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const formatRupiah = (n) => 'Rp ' + Math.floor(Number(n) || 0).toLocaleString('id-ID');

  const copyOrderCode = (code) => {
    navigator.clipboard.writeText(code);
    showSuccess('Salin Kode', `Kode order laundry berhasil disalin: ${code}`);
  };

  const MAX_VISIBLE = 5;
  const visibleOrders = showAll ? orders : orders.slice(0, MAX_VISIBLE);

  return (
    <div className="customer-dashboard" style={{ minHeight: 'calc(100vh - 68px)', background: 'var(--bg)', paddingTop: 20 }}>
      <div className="container" style={{ maxWidth: 800 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ padding: '8px 12px' }}>
            <FiArrowLeft /> Kembali
          </Link>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', color: 'var(--navy)', margin: 0 }}>
            Riwayat Pesanan
          </h2>
        </div>

        {loading ? (
          <>
            <HistoryCardSkeleton />
            <HistoryCardSkeleton />
            <HistoryCardSkeleton />
          </>
        ) : visibleOrders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FiCheckCircle style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-3)', marginBottom: 16 }}>Belum ada riwayat pesanan.</p>
            <Link to="/order" className="btn">Buat Pesanan Baru</Link>
          </div>
        ) : (
          <div className="history-list content-fade-in" style={{ display: 'block' }}>
            {visibleOrders.map(order => (
              <div key={order.id} className="mobile-order-card" style={{ opacity: 0.9, position: 'relative', overflow: 'hidden' }}>
                {/* Header */}
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

                {/* Meta badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className={`status-badge status-${order.status}`} style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
                    {statusLabels[order.status]}
                  </span>
                  <span className={`service-badge ${order.service_speed}`}>
                    {order.service_speed === 'express' ? <FiZap style={{ marginRight: 4 }} /> : <FiPackage style={{ marginRight: 4 }} />}
                    {formatServiceLabel(order)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>
                    {order.service_types || [...new Set(order.items?.map(i => i.service_type) || [])].join(', ') || 'Kiloan'}
                  </span>
                </div>

                {/* Info rows */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-3)' }}>Total Harga</span>
                  <strong style={{ color: 'var(--navy)' }}>{formatRupiah(order.total_price)}</strong>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button className="btn-detail" onClick={() => openDetail(order.id)} style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }}>
                    <FiInfo /> Detail Pesanan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {orders.length > MAX_VISIBLE && !showAll && (
          <button className="btn btn-secondary" onClick={() => setShowAll(true)} style={{ width: '100%', marginTop: 10 }}>
            Lihat Semua Riwayat ({orders.length})
          </button>
        )}

        {/* Modal Detail */}
        {detailModal && (
          <div className="modal-overlay" onClick={() => setDetailModal(null)}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
              <div className="detail-header">
                <h3>Detail Pesanan <span style={{ fontWeight: 400, color: '#64748b' }}>{detailModal.order_code}</span></h3>
                <button className="btn-close" onClick={() => setDetailModal(null)}>×</button>
              </div>

              <div className="detail-section">
                <h4>Informasi Order</h4>
                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-label">Tanggal Order</div><div className="detail-value" style={{ textAlign: 'right' }}>{formatDateTime(detailModal.created_at)}</div></div>
                  {detailModal.branch_name && (
                    <div className="detail-item">
                      <div className="detail-label">Cabang</div>
                      <div className="detail-value" style={{ fontWeight: 600, color: 'var(--blue)', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <FiMapPin /> {detailModal.branch_name}
                      </div>
                    </div>
                  )}
                  <div className="detail-item"><div className="detail-label">{detailModal.status === 'batal' ? 'Dibatalkan Pada' : 'Selesai/Diterima'}</div><div className="detail-value" style={{ textAlign: 'right' }}>{formatDateTime(detailModal.delivered_at || detailModal.updated_at)}</div></div>
                  <div className="detail-item"><div className="detail-label">Layanan</div><div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 4, textAlign: 'right', justifyContent: 'flex-end' }}>{detailModal.service_speed === 'express' ? <FiZap /> : <FiPackage />} {formatServiceLabel(detailModal)}</div></div>
                  <div className="detail-item" style={{ alignItems: 'flex-start' }}><div className="detail-label">Alamat</div><div className="detail-value" style={{ textAlign: 'right', flex: 1 }}>{detailModal.address || '-'}</div></div>
                  <div className="detail-item"><div className="detail-label">Total Harga</div><div className="detail-value" style={{ fontWeight: 700, color: 'var(--navy)', textAlign: 'right' }}>{formatRupiah(detailModal.total_price)}</div></div>
                </div>
              </div>

              {detailModal.items?.length > 0 && (
                <div className="detail-section">
                  <h4>Item Pesanan</h4>
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
                        {detailModal.items.map(item => {
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
                        {detailModal.additional_charge > 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600 }}>Biaya Tambahan</td>
                            <td style={{ textAlign: 'right' }}>{formatRupiah(detailModal.additional_charge)}</td>
                          </tr>
                        )}
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
              )}

              <div className="detail-section">
                <h4>Dokumentasi & Bukti</h4>
                {[
                  { label: 'Foto Barang dari Laundry', key: 'photo_url', icon: <FiCamera /> },
                  { label: 'Bukti Pembayaran', key: 'payment_proof', icon: <FiFileText /> },
                  { label: 'Bukti Pengantaran', key: 'delivery_proof', icon: <FiTruck /> }
                ].map(item => (
                  <AccordionItem key={item.key} icon={item.icon} label={item.label} hasContent={!!detailModal[item.key]}>
                    {detailModal[item.key] ? (
                      <div>
                        <img src={resolveFileUrl(detailModal[item.key])} alt={item.label} style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 10 }} />
                        {item.key === 'delivery_proof' && detailModal.courier_phone && (
                          <a
                            href={`https://wa.me/${formatWA(detailModal.courier_phone)}`}
                            target="_blank" rel="noreferrer"
                            className="btn btn-sm"
                            style={{ background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                          >
                            <FiMessageCircle /> Hubungi Kurir (WA)
                          </a>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#888', fontSize: '0.85rem' }}>Belum tersedia</p>
                    )}
                  </AccordionItem>
                ))}
              </div>

              <ReceiptDownloader order={detailModal} />

              <button className="btn" onClick={() => setDetailModal(null)} style={{ width: '100%', marginTop: 20 }}>Tutup</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;