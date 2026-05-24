import React, { useState, useEffect } from 'react';
import PhotoUploader from '../components/PhotoUploader';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showWarning, showLoading } from '../utils/swal';
import {
  FiMapPin, FiPackage, FiTag, FiFileText,
  FiPlus, FiTrash2, FiSend, FiCheckCircle, FiClock, FiArrowLeft, FiZap, FiDroplet, FiChevronDown, FiHome, FiStar, FiTruck, FiInfo
} from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';

const parfums = ['Random', 'Lavender', 'Sakura', 'Ocean Fresh', 'Vanilla'];


const SectionCard = ({ icon, title, children }) => (
  <div style={{
    background: 'white', borderRadius: 16, border: '1.5px solid #e8eaf0',
    marginBottom: 16,
    boxShadow: '0 2px 12px rgba(99,102,241,0.06)'
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
      borderBottom: '1px solid #f1f3f8', background: '#fafbff',
      borderTopLeftRadius: 15, borderTopRightRadius: 15
    }}>
      <span style={{ color: '#6366f1', fontSize: '1.1rem' }}>{icon}</span>
      <strong style={{ color: '#1e293b', fontSize: '0.92rem' }}>{title}</strong>
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

const OrderForm = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', address: '', note: '', is_primary: false });
  const [courierNotes, setCourierNotes] = useState('');
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  
  // Branch state
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // Custom Item & Voucher Dropdowns state
  const [activeTypeDropdownIndex, setActiveTypeDropdownIndex] = useState(null);
  const [activeSatuanDropdownIndex, setActiveSatuanDropdownIndex] = useState(null);
  const [voucherDropdownOpen, setVoucherDropdownOpen] = useState(false);
  
  // NEW: Services state — dynamic, tidak hardcoded kategori
  const [selectedService, setSelectedService] = useState(null);
  const [allServices, setAllServices] = useState([]);
  
  const [items, setItems] = useState([{ service_type: 'kiloan', name: '', notes: '', satuan_item: '' }]);
  const [photo, setPhoto] = useState(null);
  const [globalParfum, setGlobalParfum] = useState('Random');
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAddresses();
    fetchVouchers();
    fetchServices();
    fetchBranches();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAddresses = async () => {
    const res = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
    setAddresses(res.data);
    const primary = res.data.find(a => a.is_primary);
    if (primary) setSelectedAddressId(primary.id);
    else if (res.data.length > 0) setSelectedAddressId(res.data[0].id);
  };

  const fetchVouchers = async () => {
    try {
      const res = await axios.get('/api/orders/voucher/list', { headers: { Authorization: `Bearer ${token}` } });
      setVouchers(res.data);
    } catch {}
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/services');
      setAllServices(res.data);
    } catch (err) {
      console.error('Gagal fetch services:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/services/branches');
      setBranches(res.data);
      if (res.data.length > 0) {
        setSelectedBranchId(res.data[0].id);
      }
    } catch (err) {
      console.error('Gagal fetch branches:', err);
    }
  };

  const addItem = () => setItems([...items, { service_type: 'kiloan', name: '', notes: '', satuan_item: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const itemChange = (i, field, val) => { 
    const copy = [...items]; 
    copy[i][field] = val; 
    
    // Reset name jika ganti dari satuan ke kiloan atau sebaliknya
    if (field === 'service_type') {
      copy[i].name = '';
      copy[i].satuan_item = '';
    }
    
    // Jika pilih "Lainnya" di satuan, clear name biar user bisa ketik
    if (field === 'satuan_item' && val === 'Lainnya') {
      copy[i].name = '';
    } else if (field === 'satuan_item' && val !== 'Lainnya' && val !== '') {
      // Jika pilih item satuan (bukan Lainnya), set name sesuai pilihan
      copy[i].name = val;
    }
    
    setItems(copy); 
  };

  const handleAddAddress = async () => {
    if (!newAddress.address.trim()) return showWarning('Alamat Kosong', 'Silakan isi detail alamat Anda');
    await axios.post('/api/addresses', newAddress, { headers: { Authorization: `Bearer ${token}` } });
    showSuccess('Sukses', 'Alamat berhasil disimpan');
    fetchAddresses();
    setShowAddAddress(false);
    setNewAddress({ label: '', address: '', note: '', is_primary: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedBranchId) return showWarning('Pilih Cabang', 'Silakan pilih cabang laundry terdekat');
    if (!selectedAddressId) return showWarning('Alamat Penjemputan', 'Silakan pilih alamat penjemputan pakaian');
    if (selectedAddressId === 'new') return showWarning('Simpan Alamat Baru', 'Silakan simpan alamat baru Anda terlebih dahulu');
    if (!selectedService) return showWarning('Pilih Layanan', 'Silakan pilih layanan laundry terlebih dahulu');
    if (!photo) return showWarning('Unggah Foto Barang', 'Foto barang wajib diupload sebelum mengirim pesanan');
    
    // Validasi items
    for (let item of items) {
      if (item.service_type === 'kiloan' && !item.name.trim()) {
        return showWarning('Nama Barang Kosong', 'Nama item laundry kiloan tidak boleh kosong');
      }
      if (item.service_type === 'satuan' && !item.name.trim()) {
        return showWarning('Jenis Barang Satuan', 'Pilih jenis barang satuan atau isi "Lainnya" terlebih dahulu');
      }
    }
    
    setSubmitting(true);
    const formData = new FormData();
    formData.append('branch_id', selectedBranchId);
    formData.append('address_id', selectedAddressId);
    formData.append('courier_notes', courierNotes);
    formData.append('service_speed', selectedService.type); // reguler or express
    formData.append('service_id', selectedService.id); // NEW
    
    const updatedItems = items.map(item => ({ 
      ...item, 
      parfum: globalParfum,
      name: item.service_type === 'satuan' ? item.name : item.name
    }));
    formData.append('items', JSON.stringify(updatedItems));
    
    if (photo) formData.append('photo', photo);
    if (selectedVoucher) formData.append('voucher_code', selectedVoucher);
    
    try {
      showLoading('Membuat Pesanan', 'Mengunggah foto dan memproses data...');
      await axios.post('/api/orders', formData, { 
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data' 
        } 
      });
      await showSuccess('Order Terkirim', 'Order laundry Anda berhasil dibuat dan dikirim!');
      navigate('/dashboard');
    } catch (err) { 
      showError('Pemesanan Gagal', err.response?.data?.message || 'Gagal membuat order laundry'); 
    }
    finally { setSubmitting(false); }
  };

  const getCategoryLabel = (cat) => {
    const labels = { cuci_setrika: 'Cuci Setrika', cuci_lipat: 'Cuci Lipat', satuan: 'Layanan Satuan' };
    return labels[cat] || cat;
  };

  const getServiceDisplay = (service) => {
    let timeText = '';
    if (service.time_days > 0) timeText = `${service.time_days} Hari`;
    else if (service.time_hours > 0) timeText = `${service.time_hours} Jam`;
    return {
      name: service.name,
      time: timeText,
      icon: service.type === 'express' ? <FiZap /> : <FiPackage />,
      category: getCategoryLabel(service.category),
      price: service.price_per_unit,
      unit: service.unit_type,
    };
  };

  // Group services secara DINAMIS berdasarkan kategori yang ada di database
  // Sehingga kategori baru yang ditambah admin langsung muncul tanpa perlu edit kode
  const categoryLabelMap = {
    cuci_setrika: 'Cuci Setrika',
    cuci_lipat: 'Cuci Lipat',
    satuan: 'Layanan Satuan',
  };

  const groupedServices = Object.entries(
    allServices.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {})
  )
    .filter(([key, items]) => items.length > 0 && (key === 'cuci_setrika' || key === 'cuci_lipat'))
    .map(([key, items]) => ({
      key,
      label: categoryLabelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      items,
    }));

  const dynamicSatuanItems = allServices
    .filter(s => s.category === 'satuan')
    .map(s => s.name);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 40px' }} className="order-form-wrap">
      <button 
        onClick={() => navigate(-1)} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          background: 'none', 
          border: 'none', 
          color: '#64748b', 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          cursor: 'pointer',
          marginBottom: 16,
          padding: 0
        }}
      >
        <FiArrowLeft /> Kembali
      </button>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.3rem' }}>
            <GiWashingMachine />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 800, fontSize: '1.4rem' }}>Order Laundry</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Isi form di bawah untuk melakukan pemesanan</p>
          </div>
        </div>
      </div>

      {/* QRIS Payment Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        border: '1.5px solid #bfdbfe',
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.08)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          width: 38,
          height: 38,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.15rem',
          flexShrink: 0,
          boxShadow: '0 3px 8px rgba(37, 99, 235, 0.3)'
        }}>
          <FiCheckCircle />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>Informasi Pembayaran</h4>
          <p style={{ margin: 0, color: '#1e40af', fontSize: '0.82rem', lineHeight: '1.4', fontWeight: 500 }}>
            Demi kemudahan dan kepraktisan transaksi, Alinea Laundry saat ini <strong>hanya melayani metode pembayaran via QRIS</strong>. Tagihan pembayaran akan muncul di dashboard Anda setelah admin memvalidasi berat dan harga pakaian Anda.
          </p>
        </div>
      </div>

      {/* 0. Cabang Laundry */}
      <SectionCard icon={<FiHome />} title="Pilih Cabang Laundry">
        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
          Pilih lokasi cabang terdekat untuk memproses laundry Anda
        </label>
        
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1.5px solid #e8eaf0',
              background: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.88rem',
              color: '#1e293b',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={e => e.currentTarget.style.border = '1.5px solid #6366f1'}
            onMouseLeave={e => e.currentTarget.style.border = '1.5px solid #e8eaf0'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <FiHome style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {(() => {
                  if (selectedBranchId === '') return '-- Pilih Cabang --';
                  const selected = branches.find(b => String(b.id) === String(selectedBranchId));
                  if (!selected) return '-- Pilih Cabang --';
                  return selected.name;
                })()}
              </span>
            </div>
            <FiChevronDown 
              style={{ 
                color: '#64748b', 
                transition: 'transform 0.2s', 
                transform: branchDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                marginLeft: 8,
                flexShrink: 0
              }} 
            />
          </div>

          {branchDropdownOpen && (
            <>
              {/* Overlay background for closing on click away */}
              <div 
                onClick={() => setBranchDropdownOpen(false)}
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
                  top: 'calc(100% + 6px)',
                  left: 0, right: 0,
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 999,
                  overflowY: 'auto',
                  maxHeight: '260px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                {branches.map(b => {
                  const isSelected = String(selectedBranchId) === String(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBranchId(b.id);
                        setBranchDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        color: isSelected ? '#fff' : '#1e293b',
                        background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        <span>{b.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* 1. Alamat */}
      <SectionCard icon={<FiMapPin />} title="Alamat Penjemputan">
        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Pilih alamat tersimpan</label>
        {/* Custom Select Dropdown */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div
            onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1.5px solid #e8eaf0',
              background: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.88rem',
              color: '#1e293b',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={e => e.currentTarget.style.border = '1.5px solid #6366f1'}
            onMouseLeave={e => e.currentTarget.style.border = '1.5px solid #e8eaf0'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <FiMapPin style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {(() => {
                  if (selectedAddressId === '') return '-- Pilih Alamat --';
                  if (selectedAddressId === 'new') return '+ Tambah Alamat Baru';
                  const selected = addresses.find(a => String(a.id) === String(selectedAddressId));
                  if (!selected) return '-- Pilih Alamat --';
                  return `${selected.is_primary ? '[Utama] ' : ''}${selected.label} — ${selected.address}`;
                })()}
              </span>
            </div>
            <FiChevronDown 
              style={{ 
                color: '#64748b', 
                transition: 'transform 0.2s', 
                transform: addressDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                marginLeft: 8,
                flexShrink: 0
              }} 
            />
          </div>

          {addressDropdownOpen && (
            <>
              {/* Overlay background for closing on click away */}
              <div 
                onClick={() => setAddressDropdownOpen(false)}
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
                  top: 'calc(100% + 6px)',
                  left: 0, right: 0,
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 999,
                  overflowY: 'auto',
                  maxHeight: '260px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                <div
                  onClick={() => {
                    setSelectedAddressId('');
                    setShowAddAddress(false);
                    setAddressDropdownOpen(false);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: selectedAddressId === '' ? '#fff' : '#64748b',
                    background: selectedAddressId === '' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    fontWeight: selectedAddressId === '' ? 700 : 500,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (selectedAddressId !== '') e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={e => {
                    if (selectedAddressId !== '') e.currentTarget.style.background = 'transparent';
                  }}
                >
                  -- Pilih Alamat --
                </div>

                {addresses.map(a => {
                  const isSelected = String(selectedAddressId) === String(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedAddressId(a.id);
                        setShowAddAddress(false);
                        setAddressDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: isSelected ? '#fff' : '#1e293b',
                        background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        {a.is_primary && <FiStar style={{ color: isSelected ? '#fff' : '#eab308', fill: isSelected ? '#fff' : '#eab308' }} />}
                        <span>{a.label}</span>
                      </div>
                      <div style={{ 
                        fontSize: '0.78rem', 
                        color: isSelected ? 'rgba(255,255,255,0.85)' : '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {a.address} {a.note ? `(${a.note})` : ''}
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={() => {
                    setSelectedAddressId('');
                    setShowAddAddress(true);
                    setAddressDropdownOpen(false);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#4f46e5',
                    background: '#f5f3ff',
                    fontWeight: 700,
                    textAlign: 'center',
                    border: '1px dashed #c7d2fe',
                    transition: 'all 0.15s',
                    marginTop: '4px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#ede9fe';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f5f3ff';
                  }}
                >
                  + Tambah Alamat Baru
                </div>
              </div>
            </>
          )}
        </div>



        {showAddAddress && (
          <div style={{ marginTop: 14, padding: 14, background: '#f8faff', borderRadius: 12, border: '1px solid #e0e7ff' }}>
            <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Alamat Baru</strong>
            <input className="form-input" placeholder="Label (Rumah / Kos / Kantor)" value={newAddress.label} onChange={e => setNewAddress({ ...newAddress, label: e.target.value })} style={{ marginTop: 8 }} required />
            <textarea className="form-input" placeholder="Alamat lengkap" value={newAddress.address} onChange={e => setNewAddress({ ...newAddress, address: e.target.value })} rows={2} style={{ marginTop: 8 }} required />
            <input className="form-input" placeholder="Catatan Alamat (opsional)" value={newAddress.note} onChange={e => setNewAddress({ ...newAddress, note: e.target.value })} style={{ marginTop: 8 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', marginTop: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={newAddress.is_primary} onChange={e => setNewAddress({ ...newAddress, is_primary: e.target.checked })} /> Jadikan alamat utama
            </label>
            <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={handleAddAddress}><FiCheckCircle /> Simpan Alamat</button>
          </div>
        )}
      </SectionCard>

      {/* 2. PILIH LAYANAN */}
      <SectionCard icon={<FiClock />} title="Pilih Layanan">
        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 12 }}>
          Pilih jenis dan kecepatan layanan
        </label>

        {groupedServices.map(group => (
          <div key={group.key} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6
            }}>
              {group.key === 'cuci_setrika' ? <GiWashingMachine /> : <FiDroplet />} {group.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {group.items.map(service => {
                const display = getServiceDisplay(service);
                const isSelected = selectedService?.id === service.id;
                const speedText = service.type === 'express' ? 'Express' : 'Reguler';
                
                return (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}
                  >
                    <div style={{ 
                      fontSize: '1.2rem', 
                      color: isSelected ? 'var(--blue)' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {display.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: isSelected ? 'var(--navy)' : '#1e293b', 
                        fontSize: '0.88rem',
                        lineHeight: 1.2
                      }}>
                        {speedText} {display.time}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? 'var(--blue)' : 'var(--text-3)', marginTop: 2 }}>
                        Rp {Math.floor(display.price || 0).toLocaleString('id-ID')}/{display.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {selectedService && (
          <div style={{
            marginTop: 12,
            padding: 10,
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            fontSize: '0.82rem',
            color: '#166534',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCheckCircle /> Layanan dipilih: {getCategoryLabel(selectedService.category)} · {selectedService.type === 'express' ? 'Express' : 'Reguler'}
                {selectedService.time_days > 0 ? ` · ${selectedService.time_days} Hari` : selectedService.time_hours > 0 ? ` · ${selectedService.time_hours} Jam` : ''}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontStyle: 'italic', marginLeft: 22, marginTop: 4 }}>
                * Waktu di atas hanya estimasi. Keterlambatan bisa terjadi karena berbagai alasan (misal: hujan mengganggu pengiriman).
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontStyle: 'italic', marginLeft: 22, marginTop: 2 }}>
                * Harga di atas belum termasuk jika Anda menambah item Satuan di bawah.
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 3. Item Cucian */}
      {selectedService && (
        <SectionCard icon={<FiPackage />} title="Item Cucian">
          {items.map((item, idx) => (
            <div key={idx} style={{ background: '#f8faff', borderRadius: 12, padding: 14, marginBottom: 10, border: '1px solid #e0e7ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '0.85rem' }}>Item #{idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                    <FiTrash2 /> Hapus
                  </button>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Tipe</label>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => {
                        setActiveTypeDropdownIndex(activeTypeDropdownIndex === idx ? null : idx);
                        setActiveSatuanDropdownIndex(null);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #e8eaf0',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => e.currentTarget.style.border = '1.5px solid #6366f1'}
                      onMouseLeave={e => e.currentTarget.style.border = '1.5px solid #e8eaf0'}
                    >
                      <span>{item.service_type === 'kiloan' ? 'Kiloan' : 'Satuan'}</span>
                      <FiChevronDown style={{ 
                        color: '#64748b', 
                        transition: 'transform 0.2s',
                        transform: activeTypeDropdownIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)' 
                      }} />
                    </div>

                    {activeTypeDropdownIndex === idx && (
                      <>
                        <div 
                          onClick={() => setActiveTypeDropdownIndex(null)}
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
                            boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.08)',
                            zIndex: 999,
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            fontFamily: 'Outfit, sans-serif'
                          }}
                        >
                          {['kiloan', 'satuan'].map(type => {
                            const isSelected = item.service_type === type;
                            return (
                              <div
                                key={type}
                                onClick={() => {
                                  itemChange(idx, 'service_type', type);
                                  setActiveTypeDropdownIndex(null);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem',
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
                                {type === 'kiloan' ? 'Kiloan' : 'Satuan'}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    {item.service_type === 'kiloan' ? 'Nama Item' : 'Jenis Barang'}
                  </label>
                  
                  {item.service_type === 'kiloan' ? (
                    <input 
                      className="form-input" 
                      placeholder="Baju, Celana, dll" 
                      value={item.name} 
                      onChange={e => itemChange(idx, 'name', e.target.value)} 
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => {
                          setActiveSatuanDropdownIndex(activeSatuanDropdownIndex === idx ? null : idx);
                          setActiveTypeDropdownIndex(null);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #e8eaf0',
                          background: '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: 'Outfit, sans-serif',
                          fontSize: '0.85rem',
                          color: '#1e293b',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          height: '42px',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={e => e.currentTarget.style.border = '1.5px solid #6366f1'}
                        onMouseLeave={e => e.currentTarget.style.border = '1.5px solid #e8eaf0'}
                      >
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {item.satuan_item || '-- Pilih --'}
                        </span>
                        <FiChevronDown style={{ 
                          color: '#64748b', 
                          transition: 'transform 0.2s',
                          transform: activeSatuanDropdownIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)' 
                        }} />
                      </div>

                      {activeSatuanDropdownIndex === idx && (
                        <>
                          <div 
                            onClick={() => setActiveSatuanDropdownIndex(null)}
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
                              boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.08)',
                              zIndex: 999,
                              padding: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              fontFamily: 'Outfit, sans-serif',
                              maxHeight: '180px',
                              overflowY: 'auto'
                            }}
                          >
                            <div
                              onClick={() => {
                                itemChange(idx, 'satuan_item', '');
                                setActiveSatuanDropdownIndex(null);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                color: item.satuan_item === '' ? '#fff' : '#64748b',
                                background: item.satuan_item === '' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                fontWeight: item.satuan_item === '' ? 700 : 500,
                                transition: 'all 0.1s'
                              }}
                              onMouseEnter={e => {
                                if (item.satuan_item !== '') e.currentTarget.style.background = '#f1f5f9';
                              }}
                              onMouseLeave={e => {
                                if (item.satuan_item !== '') e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              -- Pilih --
                            </div>
                            {dynamicSatuanItems.map(si => {
                              const isSelected = item.satuan_item === si;
                              return (
                                <div
                                  key={si}
                                  onClick={() => {
                                    itemChange(idx, 'satuan_item', si);
                                    setActiveSatuanDropdownIndex(null);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
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
                                  {si}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Jika pilih "Lainnya" di satuan, muncul input text */}
              {item.service_type === 'satuan' && item.satuan_item === 'Lainnya' && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Tulis Jenis Barang
                  </label>
                  <input 
                    className="form-input" 
                    placeholder="Contoh: Jaket Kulit, Tas Ransel, dll" 
                    value={item.name} 
                    onChange={e => itemChange(idx, 'name', e.target.value)} 
                  />
                </div>
              )}
              
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Catatan Khusus (Opsional)</label>
                <input className="form-input" placeholder="Contoh: ada noda kopi di kerah" value={item.notes} onChange={e => itemChange(idx, 'notes', e.target.value)} />
              </div>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={addItem} style={{ width: '100%', marginTop: 4 }}>
            <FiPlus /> Tambah Item
          </button>
        </SectionCard>
      )}

      {/* 4. Parfum */}
      {selectedService && (
        <SectionCard icon={<FiDroplet className="text-sky" />} title="Pilih Parfum">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {parfums.map(p => (
              <button
                key={p}
                onClick={() => setGlobalParfum(p)}
                style={{
                  padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  border: globalParfum === p ? '2px solid #6366f1' : '2px solid #e8eaf0',
                  background: globalParfum === p ? '#6366f1' : 'white',
                  color: globalParfum === p ? 'white' : '#475569',
                  transition: 'all 0.2s',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
            * 1 parfum untuk semua item dalam pesanan ini
          </p>
        </SectionCard>
      )}

      {/* 5. Voucher */}
      {selectedService && (
        <SectionCard icon={<FiTag />} title="Voucher">
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => {
                if (vouchers.length > 0) {
                  setVoucherDropdownOpen(!voucherDropdownOpen);
                }
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid #e8eaf0',
                background: vouchers.length === 0 ? '#f1f5f9' : '#f8fafc',
                cursor: vouchers.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.88rem',
                color: '#1e293b',
                transition: 'all 0.2s',
                opacity: vouchers.length === 0 ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={e => {
                if (vouchers.length > 0) e.currentTarget.style.border = '1.5px solid #6366f1';
              }}
              onMouseLeave={e => {
                if (vouchers.length > 0) e.currentTarget.style.border = '1.5px solid #e8eaf0';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <FiTag style={{ color: '#6366f1', flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {selectedVoucher ? selectedVoucher : (vouchers.length > 0 ? 'Tanpa Voucher' : 'Tidak ada voucher tersedia')}
                </span>
              </div>
              {vouchers.length > 0 && (
                <FiChevronDown 
                  style={{ 
                    color: '#64748b', 
                    transition: 'transform 0.2s', 
                    transform: voucherDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    marginLeft: 8,
                    flexShrink: 0
                  }} 
                />
              )}
            </div>

            {voucherDropdownOpen && vouchers.length > 0 && (
              <>
                <div 
                  onClick={() => setVoucherDropdownOpen(false)}
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
                    top: 'calc(100% + 6px)',
                    left: 0, right: 0,
                    background: 'white',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                    zIndex: 999,
                    overflowY: 'auto',
                    maxHeight: '200px',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontFamily: 'Outfit, sans-serif'
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedVoucher('');
                      setVoucherDropdownOpen(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: selectedVoucher === '' ? '#fff' : '#64748b',
                      background: selectedVoucher === '' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                      fontWeight: selectedVoucher === '' ? 700 : 500,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (selectedVoucher !== '') e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={e => {
                      if (selectedVoucher !== '') e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Tanpa Voucher
                  </div>

                  {vouchers.map(v => {
                    const isSelected = selectedVoucher === v.code;
                    return (
                      <div
                        key={v.code}
                        onClick={() => {
                          setSelectedVoucher(v.code);
                          setVoucherDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: isSelected ? '#fff' : '#1e293b',
                          background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                          fontWeight: isSelected ? 700 : 500,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <FiTag className="icon-inline" /> {v.code}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* 6. Catatan & Foto */}
      {selectedService && (
        <SectionCard icon={<FiFileText />} title="Catatan & Foto">
          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <FiTruck style={{ marginRight: 4 }} /> Catatan untuk Kurir <span style={{ color: '#94a3b8', marginLeft: 4 }}>(penjemputan/pengantaran)</span>
          </label>
          <textarea className="form-input" placeholder="Misal: jemput jam 10 pagi, telepon dulu sebelum datang" value={courierNotes} onChange={e => setCourierNotes(e.target.value)} rows={2} style={{ marginBottom: 14 }} />
          <PhotoUploader
            label="Foto Barang"
            required
            photo={photo}
            onPhoto={setPhoto}
          />
        </SectionCard>
      )}

      {/* Submit */}
      <button 
        className="btn" 
        onClick={handleSubmit} 
        disabled={submitting || !selectedService} 
        style={{ 
          width: '100%', 
          padding: '14px', 
          fontSize: '1rem', 
          fontWeight: 700, 
          borderRadius: 14, 
          marginBottom: 16,
          opacity: !selectedService ? 0.5 : 1,
          cursor: !selectedService ? 'not-allowed' : 'pointer'
        }}
      >
        <FiSend style={{ marginRight: 8 }} />
        {submitting ? 'Mengirim...' : !selectedService ? 'Pilih Layanan Dulu' : 'Kirim Order'}
      </button>

      {/* Info box & Pricelist */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          background: '#fffbeb', 
          border: '1px solid #fef3c7', 
          borderRadius: 12, 
          padding: 14,
          fontSize: '0.82rem',
          color: '#92400e',
          lineHeight: 1.5,
          marginBottom: 16
        }}>
          <strong><FiInfo style={{ position: 'relative', top: '2px', marginRight: '4px' }}/> Informasi:</strong><br />
          Harga akan dihitung oleh admin saat validasi pesanan. Anda akan menerima notifikasi total biaya setelah pesanan divalidasi.
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(146, 64, 14, 0.1)' }}>
            <strong><FiFileText className="icon-inline" /> Catatan Penting:</strong><br />
            Pastikan pakaian tidak ada barang berharga tertinggal. Kami tidak bertanggung jawab atas kehilangan barang di dalam saku.
          </div>
        </div>

        <SectionCard icon={<FiTag />} title="Pricelist Lengkap">
          <div style={{ display: 'grid', gap: 16 }}>
            {Object.entries(
              allServices.reduce((acc, s) => {
                if (!acc[s.category]) acc[s.category] = [];
                acc[s.category].push(s);
                return acc;
              }, {})
            ).map(([category, items]) => (
              <div key={category}>
                <h4 style={{ 
                  fontSize: '0.75rem', 
                  color: '#6366f1', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                  borderBottom: '1px solid #f1f3f8',
                  paddingBottom: 4
                }}>
                  {category === 'cuci_setrika' ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><GiWashingMachine /> Cuci Setrika</span> : 
                   category === 'cuci_lipat' ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><FiDroplet /> Cuci Lipat</span> : 
                   <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><FiTag /> {categoryLabelMap[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>}
                </h4>
                <div style={{ display: 'grid', gap: 6 }}>
                  {items.map(s => (
                    <div key={s.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '0.82rem',
                      color: '#475569',
                      padding: '4px 0'
                    }}>
                      <span>
                        {category === 'cuci_setrika' || category === 'cuci_lipat'
                          ? `${s.type === 'express' ? 'Express' : 'Reguler'} ${s.time_days > 0 ? s.time_days + ' Hari' : s.time_hours + ' Jam'}`
                          : s.name}
                      </span>
                      <strong style={{ color: '#1e293b' }}>
                        Rp {Math.floor(Number(s.price_per_unit) || 0).toLocaleString('id-ID')}
                        <small style={{ fontWeight: 400, color: '#94a3b8' }}>/{s.unit_type}</small>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default OrderForm;