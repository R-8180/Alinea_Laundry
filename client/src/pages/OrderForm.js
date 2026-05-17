import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FiMapPin, FiPackage, FiTag, FiCamera, FiFileText,
  FiPlus, FiTrash2, FiSend, FiAlertCircle, FiCheckCircle, FiClock, FiArrowLeft, FiZap, FiDroplet
} from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';

const parfums = ['Random', 'Lavender', 'Sakura', 'Ocean Fresh', 'Vanilla'];

const satuanItems = ['Boneka', 'Karpet', 'Sepatu', 'Bantal', 'Lainnya'];

const SectionCard = ({ icon, title, children }) => (
  <div style={{
    background: 'white', borderRadius: 16, border: '1.5px solid #e8eaf0',
    marginBottom: 16, overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(99,102,241,0.06)'
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
      borderBottom: '1px solid #f1f3f8', background: '#fafbff'
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
  const [addressNote, setAddressNote] = useState('');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', address: '', is_primary: false });
  const [notes, setNotes] = useState('');
  
  // NEW: Services state
  const [selectedService, setSelectedService] = useState(null);
  const [servicesByCategory, setServicesByCategory] = useState({
    cuci_setrika: [],
    cuci_lipat: [],
    satuan: []
  });
  
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
      
      
      // Group by category
      const grouped = {
        cuci_setrika: res.data.filter(s => s.category === 'cuci_setrika'),
        cuci_lipat: res.data.filter(s => s.category === 'cuci_lipat'),
        satuan: res.data.filter(s => s.category === 'satuan')
      };
      setServicesByCategory(grouped);
    } catch (err) {
      console.error('Gagal fetch services:', err);
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
    if (!newAddress.address.trim()) return alert('Isi alamat');
    await axios.post('/api/addresses', newAddress, { headers: { Authorization: `Bearer ${token}` } });
    alert('Alamat disimpan');
    fetchAddresses();
    setShowAddAddress(false);
    setNewAddress({ label: '', address: '', is_primary: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAddressId) return alert('Pilih alamat penjemputan');
    if (!selectedService) return alert('Pilih layanan terlebih dahulu');
    
    // Validasi items
    for (let item of items) {
      if (item.service_type === 'kiloan' && !item.name.trim()) {
        return alert('Nama item kiloan tidak boleh kosong');
      }
      if (item.service_type === 'satuan' && !item.name.trim()) {
        return alert('Pilih jenis barang satuan atau isi "Lainnya"');
      }
    }
    
    setSubmitting(true);
    const formData = new FormData();
    formData.append('address_id', selectedAddressId);
    formData.append('notes', addressNote ? `${addressNote}${notes ? ' | ' + notes : ''}` : notes);
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
      await axios.post('/api/orders', formData, { 
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data' 
        } 
      });
      alert('Order berhasil dikirim!');
      navigate('/dashboard');
    } catch (err) { 
      alert(err.response?.data?.message || 'Gagal membuat order'); 
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

  // Group services untuk display per kategori

  // Group per kategori untuk tampilan terpisah
  const groupedServices = [
    { key: 'cuci_setrika', label: 'Cuci Setrika', items: servicesByCategory.cuci_setrika },
    { key: 'cuci_lipat', label: 'Cuci Lipat', items: servicesByCategory.cuci_lipat },
  ].filter(g => g.items.length > 0);

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

      {/* 1. Alamat */}
      <SectionCard icon={<FiMapPin />} title="Alamat Penjemputan">
        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Pilih alamat tersimpan</label>
        <select
          className="form-select"
          value={selectedAddressId}
          onChange={e => {
            const val = e.target.value;
            if (val === 'new') { setShowAddAddress(true); setSelectedAddressId(''); }
            else { setShowAddAddress(false); setSelectedAddressId(val); }
          }}
          style={{ width: '100%', marginBottom: 12 }}
        >
          <option value="">-- Pilih Alamat --</option>
          {addresses.map(a => <option key={a.id} value={a.id}>{a.is_primary ? '⭐ ' : ''}{a.label} — {a.address}</option>)}
          <option value="new">+ Tambah Alamat Baru</option>
        </select>

        {/* Keterangan Alamat */}
        <div style={{ background: '#f8faff', border: '1.5px dashed #c7d2fe', borderRadius: 10, padding: 12 }}>
          <label style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 600, display: 'block', marginBottom: 4 }}>
            <FiAlertCircle style={{ marginRight: 4 }} />Keterangan Alamat <span style={{ color: '#64748b', fontWeight: 400 }}>(opsional)</span>
          </label>
          <input
            type="text"
            placeholder="Contoh: Kos warna biru, lantai 2, pagar besi"
            value={addressNote}
            onChange={e => setAddressNote(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.87rem', color: '#1e293b' }}
          />
        </div>

        {showAddAddress && (
          <div style={{ marginTop: 14, padding: 14, background: '#f8faff', borderRadius: 12, border: '1px solid #e0e7ff' }}>
            <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Alamat Baru</strong>
            <input className="form-input" placeholder="Label (Rumah / Kos / Kantor)" value={newAddress.label} onChange={e => setNewAddress({ ...newAddress, label: e.target.value })} style={{ marginTop: 8 }} />
            <textarea className="form-input" placeholder="Alamat lengkap" value={newAddress.address} onChange={e => setNewAddress({ ...newAddress, address: e.target.value })} rows={2} style={{ marginTop: 8 }} required />
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
                  <select 
                    className="form-select" 
                    value={item.service_type} 
                    onChange={e => itemChange(idx, 'service_type', e.target.value)}
                  >
                    <option value="kiloan">Kiloan</option>
                    <option value="satuan">Satuan</option>
                  </select>
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
                    <select
                      className="form-select"
                      value={item.satuan_item}
                      onChange={e => itemChange(idx, 'satuan_item', e.target.value)}
                    >
                      <option value="">-- Pilih --</option>
                      {satuanItems.map(si => (
                        <option key={si} value={si}>{si}</option>
                      ))}
                    </select>
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
        <SectionCard icon={<span>🌸</span>} title="Pilih Parfum">
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
          <select 
            className="form-select" 
            value={selectedVoucher} 
            onChange={e => setSelectedVoucher(e.target.value)} 
            style={{ width: '100%' }}
            disabled={vouchers.length === 0}
          >
            <option value="">{vouchers.length > 0 ? 'Tanpa Voucher' : 'Tidak ada voucher tersedia'}</option>
            {vouchers.map(v => <option key={v.code} value={v.code}>🎟️ {v.code}</option>)}
          </select>
        </SectionCard>
      )}

      {/* 6. Catatan & Foto */}
      {selectedService && (
        <SectionCard icon={<FiFileText />} title="Catatan & Foto">
          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Catatan untuk Kurir</label>
          <textarea className="form-input" placeholder="Misal: jemput jam 10 pagi, telepon dulu sebelum datang" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ marginBottom: 14 }} />
          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
            <FiCamera style={{ marginRight: 4 }} />Foto Barang <span style={{ color: '#94a3b8' }}>(opsional)</span>
          </label>
          <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} style={{ fontSize: '0.85rem' }} />
          {photo && <p style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><FiCheckCircle /> {photo.name}</p>}
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
          <strong>ℹ️ Informasi:</strong><br />
          Harga akan dihitung oleh admin saat validasi pesanan. Anda akan menerima notifikasi total biaya setelah pesanan divalidasi.
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(146, 64, 14, 0.1)' }}>
            <strong>📝 Catatan Penting:</strong><br />
            Pastikan pakaian tidak ada barang berharga tertinggal. Kami tidak bertanggung jawab atas kehilangan barang di dalam saku.
          </div>
        </div>

        <SectionCard icon={<FiTag />} title="Pricelist Lengkap">
          <div style={{ display: 'grid', gap: 16 }}>
            {Object.entries(servicesByCategory).map(([category, items]) => (
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
                   category === 'cuci_lipat' ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><FiDroplet /> Cuci Lipat</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><FiTag /> Layanan Satuan</span>}
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
                      <span>{s.name}</span>
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