import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading } from '../utils/swal';
import { FiUser, FiPackage, FiFileText, FiCamera, FiDollarSign, FiPlus, FiTrash2, FiSave, FiMapPin, FiCreditCard, FiCheckCircle, FiZap, FiChevronDown, FiEdit3 } from 'react-icons/fi';
import PhotoUploader from '../components/PhotoUploader';

// Komponen Card UI mirip OrderForm
const SectionCard = ({ icon, title, children, action }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(0,0,0,0.05)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
        {icon} {title}
      </h3>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

const OfflineOrderForm = () => {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  
  const [items, setItems] = useState([{ service_type: 'kiloan', name: '', qty: 1, price_per_unit: 0 }]);
  
  const [additionalFee, setAdditionalFee] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [activeTypeDropdownIndex, setActiveTypeDropdownIndex] = useState(null);
  const [activeSatuanDropdownIndex, setActiveSatuanDropdownIndex] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchBranches();
    fetchServices();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/services/branches');
      setBranches(res.data);
      if (res.data.length > 0) setBranchId(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/services');
      setServices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Recalculate Kiloan item prices when selected service changes
  useEffect(() => {
    if (selectedService) {
      setItems(prevItems => prevItems.map(item => {
        if (item.service_type === 'kiloan') {
          return { ...item, price_per_unit: selectedService.price_per_unit };
        }
        return item;
      }));
    }
  }, [selectedService]);

  // Recalculate total price
  useEffect(() => {
    const itemsTotal = items.reduce((sum, item) => sum + ((item.price_per_unit || 0) * (item.qty || 0)), 0);
    setTotalPrice(itemsTotal + (additionalFee || 0));
  }, [items, additionalFee]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSatuanSelect = (index, serviceItem) => {
    const newItems = [...items];
    newItems[index].name = serviceItem.name;
    newItems[index].price_per_unit = serviceItem.price_per_unit || 0;
    setItems(newItems);
    setActiveSatuanDropdownIndex(null);
  };

  const addItem = () => {
    setItems([...items, { 
      service_type: 'kiloan', 
      name: '', 
      qty: 1, 
      price_per_unit: selectedService ? selectedService.price_per_unit : 0 
    }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName) return showError('Nama Pelanggan wajib diisi');
    if (!selectedService) return showError('Layanan Utama Belum Dipilih', 'Pilih paket layanan utama (misal: Cuci Setrika) terlebih dahulu');
    if (items.some(i => !i.name)) return showError('Nama Item Kosong', 'Pastikan semua item cucian memiliki nama atau keterangan');
    
    setSubmitting(true);
    showLoading('Membuat Pesanan...', 'Menyimpan data order offline');
    
    try {
      const formData = new FormData();
      formData.append('guest_name', guestName);
      formData.append('guest_phone', guestPhone);
      formData.append('branch_id', branchId);
      formData.append('service_id', selectedService.id);
      
      let finalNotes = notes;
      if (additionalFee > 0) {
        finalNotes = finalNotes ? `${finalNotes}\n(Biaya Tambahan Admin: Rp${additionalFee.toLocaleString()})` : `(Biaya Tambahan Admin: Rp${additionalFee.toLocaleString()})`;
      }
      formData.append('notes', finalNotes);
      formData.append('total_price', totalPrice);
      formData.append('payment_status', paymentStatus);
      
      // Formatting items array for backend parsing
      const formattedItems = items.map(item => ({
        service_type: item.service_type, // 'kiloan' or 'satuan'
        name: item.name,
        price_per_unit: item.price_per_unit,
        qty: item.qty
      }));
      
      formData.append('items', JSON.stringify(formattedItems));
      
      if (photo) formData.append('photo', photo);
      if (paymentProof) formData.append('payment_proof', paymentProof);

      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/offline-order', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showSuccess('Order Berhasil', `Order Offline berhasil dibuat. Kode: ${res.data.order_code}`);
      navigate('/dashboard');
    } catch (err) {
      showError('Gagal Menyimpan', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (cat) => {
    const labels = { cuci_setrika: 'Cuci Setrika', cuci_lipat: 'Cuci Lipat', satuan: 'Layanan Satuan' };
    return labels[cat] || cat;
  };

  const groupedServices = Object.entries(
    services.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {})
  )
    .filter(([key, items]) => items.length > 0 && (key === 'cuci_setrika' || key === 'cuci_lipat'))
    .map(([key, items]) => ({
      key,
      label: getCategoryLabel(key),
      items,
    }));

  const satuanServices = services.filter(s => s.category === 'satuan');

  return (
    <div style={{ maxWidth: 750, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
          <FiUser />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: 700 }}>Pesanan Offline Baru</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Sistem Kasir untuk Walk-in Customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 1. Info Pelanggan */}
        <SectionCard icon={<FiEdit3 style={{ color: '#10b981' }} />} title="Info Pelanggan">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Nama Pelanggan (Wajib)</label>
              <input type="text" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Misal: Budi" required />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>No. HP (Opsional)</label>
              <input type="text" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }} value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="0812xxxx" />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <FiMapPin /> Cabang Penjemputan
            </label>
            <select style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }} value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">-- Pilih Cabang --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </SectionCard>

        {/* 2. Pilih Layanan Utama */}
        <SectionCard icon={<FiPackage style={{ color: '#6366f1' }} />} title="Layanan Utama">
          {groupedServices.map(group => (
            <div key={group.key} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {group.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {group.items.map(service => {
                  const isSelected = selectedService?.id === service.id;
                  let timeText = '';
                  if (service.time_days > 0) timeText = `${service.time_days} Hari`;
                  else if (service.time_hours > 0) timeText = `${service.time_hours} Jam`;
                  
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <div style={{ fontSize: '1.2rem', color: isSelected ? '#6366f1' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        {service.type === 'express' ? <FiZap /> : <FiPackage />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: isSelected ? '#1e293b' : '#334155', fontSize: '0.9rem' }}>
                          {service.type === 'express' ? 'Express' : 'Reguler'} {timeText}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: isSelected ? '#6366f1' : '#64748b', marginTop: 2 }}>
                          Rp {Math.floor(service.price_per_unit || 0).toLocaleString('id-ID')}/{service.unit_type}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {selectedService && (
            <div style={{ marginTop: 12, padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCheckCircle /> Layanan Terpilih: {getCategoryLabel(selectedService.category)} · {selectedService.type === 'express' ? 'Express' : 'Reguler'}
              </div>
            </div>
          )}
        </SectionCard>

        {/* 3. Item Cucian */}
        {selectedService && (
          <SectionCard icon={<FiFileText style={{ color: '#f59e0b' }} />} title="Item Cucian">
            {items.map((item, idx) => (
              <div key={idx} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '0.9rem' }}>Item #{idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                      <FiTrash2 /> Hapus
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Tipe</label>
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => {
                          setActiveTypeDropdownIndex(activeTypeDropdownIndex === idx ? null : idx);
                          setActiveSatuanDropdownIndex(null);
                        }}
                        style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}
                      >
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#334155' }}>{item.service_type}</span>
                        <FiChevronDown style={{ color: '#94a3b8' }} />
                      </div>
                      
                      {activeTypeDropdownIndex === idx && (
                        <>
                          <div onClick={() => setActiveTypeDropdownIndex(null)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 999, padding: 4, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {['kiloan', 'satuan'].map(type => (
                              <div
                                key={type}
                                onClick={() => {
                                  handleItemChange(idx, 'service_type', type);
                                  handleItemChange(idx, 'name', '');
                                  if (type === 'kiloan') {
                                    handleItemChange(idx, 'price_per_unit', selectedService.price_per_unit);
                                  } else {
                                    handleItemChange(idx, 'price_per_unit', 0);
                                  }
                                  setActiveTypeDropdownIndex(null);
                                }}
                                style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem', textTransform: 'capitalize', background: item.service_type === type ? '#f1f5f9' : 'transparent', fontWeight: item.service_type === type ? 600 : 400 }}
                              >
                                {type}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ flex: '2 1 200px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Nama Barang</label>
                    {item.service_type === 'kiloan' ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Misal: Pakaian Campur"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                        required
                      />
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <div
                          onClick={() => {
                            setActiveSatuanDropdownIndex(activeSatuanDropdownIndex === idx ? null : idx);
                            setActiveTypeDropdownIndex(null);
                          }}
                          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}
                        >
                          <span style={{ color: item.name ? '#334155' : '#94a3b8' }}>
                            {item.name || 'Pilih layanan satuan...'}
                          </span>
                          <FiChevronDown style={{ color: '#94a3b8' }} />
                        </div>
                        
                        {activeSatuanDropdownIndex === idx && (
                          <>
                            <div onClick={() => setActiveSatuanDropdownIndex(null)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 999, padding: 4, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                              {satuanServices.length === 0 && <div style={{ padding: '8px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>Tidak ada layanan satuan</div>}
                              {satuanServices.map(s => (
                                <div
                                  key={s.id}
                                  onClick={() => handleSatuanSelect(idx, s)}
                                  style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                  <span>{s.name}</span>
                                  <span style={{ color: '#10b981', fontWeight: 600 }}>Rp {s.price_per_unit.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                      {item.service_type === 'kiloan' ? 'Berat (Kg)' : 'Jumlah (Pcs)'}
                    </label>
                    <input
                      type="number"
                      step={item.service_type === 'kiloan' ? "0.1" : "1"}
                      min={item.service_type === 'kiloan' ? "0.1" : "1"}
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Harga per {item.service_type === 'kiloan' ? 'Kg' : 'Pcs'}
                    </label>
                    <input
                      type="number"
                      value={item.price_per_unit}
                      onChange={(e) => handleItemChange(idx, 'price_per_unit', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem', background: item.service_type === 'kiloan' ? '#f8fafc' : 'white' }}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addItem}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px dashed #c7d2fe', background: '#f5f3ff', color: '#6366f1', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem' }}
            >
              <FiPlus /> Tambah Item Lainnya
            </button>
          </SectionCard>
        )}

        {/* 4. Pembayaran */}
        {selectedService && (
          <SectionCard icon={<FiDollarSign style={{ color: '#10b981' }} />} title="Pembayaran & Media">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Biaya Tambahan Admin (Rp)</label>
                <input type="number" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }} value={additionalFee} onChange={e => setAdditionalFee(Number(e.target.value))} placeholder="Misal: 15000" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Status Pembayaran</label>
                <select style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }} value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                  <option value="paid">Lunas</option>
                  <option value="pending">Belum Lunas</option>
                </select>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '16px 20px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #86efac' }}>
              <span style={{ fontWeight: 600, color: '#166534', fontSize: '1rem' }}>Total Harga Akhir:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>Rp {totalPrice.toLocaleString()}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><FiCamera /> Foto Tas Cucian</label>
                <PhotoUploader onPhotoSelected={setPhoto} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><FiCreditCard /> Foto Bukti Transfer (Opsional)</label>
                <div style={{ textAlign: 'center', marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <img src="/qris.jpg" alt="QRIS" style={{ width: '100%', maxWidth: '160px', borderRadius: '8px' }} />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>Tunjukkan QRIS ini ke pelanggan</div>
                </div>
                <PhotoUploader onPhotoSelected={setPaymentProof} />
              </div>
            </div>
            
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Catatan Admin (Opsional)</label>
              <textarea style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', minHeight: 80, fontFamily: 'inherit' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ketik keterangan tambahan di sini..." />
            </div>
          </SectionCard>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedService}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: 12, 
            background: (!selectedService || submitting) ? '#cbd5e1' : '#10b981', 
            color: 'white', 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            border: 'none', 
            cursor: (!selectedService || submitting) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: (!selectedService || submitting) ? 'none' : '0 4px 14px rgba(16,185,129,0.4)',
            transition: 'all 0.2s',
            marginTop: 10
          }}
        >
          <FiSave size={20} /> {submitting ? 'Memproses Order...' : 'Selesaikan Order Offline'}
        </button>

      </form>
    </div>
  );
};

export default OfflineOrderForm;
