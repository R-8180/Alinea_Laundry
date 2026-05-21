import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading } from '../utils/swal';
import { FiUser, FiPackage, FiFileText, FiCamera, FiDollarSign, FiPlus, FiTrash2, FiSave, FiMapPin, FiCreditCard } from 'react-icons/fi';
import PhotoUploader from '../components/PhotoUploader';

const OfflineOrderForm = () => {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([{ service_id: '', type: 'kiloan', price_per_unit: 0, quantity: 1, unit: 'kg' }]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('lunas');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    // Auto calculate total
    const total = items.reduce((sum, item) => sum + (item.price_per_unit * item.quantity), 0);
    setTotalPrice(total);
  }, [items]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'service_id') {
      const srv = services.find(s => s.id.toString() === value.toString());
      if (srv) {
        newItems[index].service_id = srv.id;
        newItems[index].price_per_unit = srv.price_per_unit || 0;
        newItems[index].unit = srv.category === 'satuan' ? 'pcs' : 'kg';
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { service_id: '', type: 'kiloan', price_per_unit: 0, quantity: 1, unit: 'kg' }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName) return showError('Nama Pelanggan wajib diisi');
    if (items.some(i => !i.service_id)) return showError('Semua item harus memilih layanan');
    
    setSubmitting(true);
    showLoading('Membuat pesanan offline...');
    try {
      const formData = new FormData();
      formData.append('guest_name', guestName);
      formData.append('guest_phone', guestPhone);
      formData.append('branch_id', branchId);
      formData.append('notes', notes);
      formData.append('total_price', totalPrice);
      formData.append('payment_status', paymentStatus);
      formData.append('items', JSON.stringify(items));
      if (photo) formData.append('photo', photo);
      if (paymentProof) formData.append('payment_proof', paymentProof);

      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/offline-order', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showSuccess('Pesanan Berhasil', `Pesanan Offline berhasil dibuat. Kode: ${res.data.order_code}`);
      navigate('/admin');
    } catch (err) {
      showError(err.response?.data?.message || 'Gagal membuat pesanan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
          <FiUser />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: 700 }}>Pesanan Offline (Walk-in)</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Buat pesanan untuk pelanggan yang datang langsung</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Info Pelanggan */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiUser /> Info Pelanggan</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Nama Pelanggan (Wajib)</label>
              <input type="text" className="form-control" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Misal: Bapak Budi" required />
            </div>
            <div>
              <label className="form-label">No. HP (Opsional)</label>
              <input type="text" className="form-control" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="0812xxxx" />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label className="form-label"><FiMapPin /> Cabang Penjemputan</label>
            <select className="form-control" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">-- Pilih Cabang --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Layanan & Item */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiPackage /> Detail Layanan</h3>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, background: '#f8fafc', padding: 16, borderRadius: 12 }}>
              <div style={{ flex: 2 }}>
                <label className="form-label">Pilih Layanan</label>
                <select className="form-control" value={item.service_id} onChange={e => handleItemChange(idx, 'service_id', e.target.value)} required>
                  <option value="">-- Pilih --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - Rp{s.price_per_unit.toLocaleString()}/{s.category === 'satuan' ? 'pcs' : 'kg'}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Harga/Unit</label>
                <input type="number" className="form-control" value={item.price_per_unit} onChange={e => handleItemChange(idx, 'price_per_unit', Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Qty ({item.unit})</label>
                <input type="number" step="0.1" className="form-control" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} required />
              </div>
              {items.length > 1 && (
                <button type="button" className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444', height: 42 }} onClick={() => removeItem(idx)}><FiTrash2 /></button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-sm" style={{ background: '#e0e7ff', color: '#4f46e5' }} onClick={addItem}><FiPlus /> Tambah Item</button>
        </div>

        {/* Pembayaran & Foto */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiDollarSign /> Pembayaran & Foto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Total Harga (Rp)</label>
              <input type="number" className="form-control" value={totalPrice} onChange={e => setTotalPrice(Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Status Pembayaran</label>
              <select className="form-control" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                <option value="lunas">Lunas</option>
                <option value="belum_lunas">Belum Lunas</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            <div>
              <label className="form-label"><FiCamera /> Foto Barang/Tas Cucian</label>
              <PhotoUploader onPhotoSelected={setPhoto} />
            </div>
            <div>
              <label className="form-label"><FiCreditCard /> Foto Bukti Pembayaran (opsional)</label>
              <PhotoUploader onPhotoSelected={setPaymentProof} />
            </div>
          </div>
          
          <div style={{ marginTop: 20 }}>
            <label className="form-label"><FiFileText /> Catatan Admin</label>
            <textarea className="form-control" rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)..." />
          </div>
        </div>

        <button type="submit" className="btn" style={{ background: 'var(--blue)', color: 'white', padding: '14px', fontSize: '1.1rem', borderRadius: 12 }} disabled={submitting}>
          <FiSave style={{ marginRight: 8 }} /> {submitting ? 'Menyimpan...' : 'Buat Pesanan Offline'}
        </button>

      </form>
    </div>
  );
};

export default OfflineOrderForm;
