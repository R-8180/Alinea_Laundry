import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiTrash2, FiPlus, FiCheckCircle, FiX } from 'react-icons/fi';

const ProfileTab = ({ user }) => {
  const [addresses, setAddresses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({ label: '', address: '', note: '' });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAddresses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAddresses = async () => {
    try {
      const res = await axios.get('/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
      setAddresses(res.data);
    } catch (err) {
      console.error('Gagal fetch alamat:', err);
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setForm({ label: '', address: '', note: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (addr) => {
    setEditMode(true);
    setCurrentId(addr.id);
    setForm({ label: addr.label, address: addr.address, note: addr.note || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus alamat ini?')) return;
    try {
      await axios.delete(`/api/addresses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchAddresses();
    } catch (err) {
      alert('Gagal menghapus alamat');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`/api/addresses/${currentId}`, form, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/addresses', form, { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowModal(false);
      fetchAddresses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan alamat');
    }
  };

  return (
    <div>
      {/* User Info Card */}
      <div className="card" style={{ padding: '20px', marginBottom: 24, borderRadius: 16 }}>
        <h3 style={{ marginBottom: 16, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiUser /> Informasi Pribadi
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sky-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
              <FiUser />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Nama Lengkap</div>
              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{user.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sky-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
              <FiMail />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Email</div>
              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sky-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
              <FiPhone />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Nomor Telepon</div>
              <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{user.phone || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Address List */}
      <div className="dashboard-header" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiMapPin /> Daftar Alamat Saya
        </h3>
        <button className="btn btn-sm" onClick={handleOpenAdd}>
          <FiPlus /> Tambah Alamat
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {addresses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: 'var(--bg)', borderRadius: 12, color: 'var(--text-3)' }}>
            Belum ada alamat tersimpan.
          </div>
        ) : (
          addresses.map(addr => (
            <div key={addr.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'white', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ color: 'var(--navy)', fontSize: '0.95rem' }}>{addr.label || 'Rumah'}</strong>
                  {addr.is_primary && <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>UTAMA</span>}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {addr.address}
                </div>
                {addr.note && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic', marginTop: 4 }}>
                    (Catatan: {addr.note})
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => handleOpenEdit(addr)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(addr.id)} style={{ background: 'none', border: '1px solid #fee2e2', borderRadius: 6, padding: '6px 10px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiTrash2 size={12} /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Tambah/Edit Alamat */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="detail-header">
              <h3>{editMode ? 'Edit Alamat' : 'Tambah Alamat Baru'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 6 }}>Label (Misal: Rumah, Kos, Kantor)</label>
                <input className="form-input" value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder="Rumah" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 6 }}>Alamat Lengkap</label>
                <textarea className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Jl. Gajah Mada No. 12" rows={3} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 6 }}>Catatan (Opsional)</label>
                <input className="form-input" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Kos cat biru, depan warung" />
              </div>
              <button type="submit" className="btn" style={{ width: '100%', padding: 12 }}>
                <FiCheckCircle style={{ marginRight: 6 }} /> Simpan Alamat
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
