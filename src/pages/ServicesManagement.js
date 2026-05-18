import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FiEdit2, FiPlus, FiCheck, FiX, FiSave, FiRefreshCw,
  FiClock, FiDollarSign, FiPackage, FiAlertCircle, FiEye, FiEyeOff, FiZap
} from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';

const categoryLabels = {
  cuci_setrika: 'Cuci Setrika',
  cuci_lipat: 'Cuci Lipat',
  satuan: 'Layanan Satuan'
};


const unitLabels = {
  kg: 'Per Kg',
  item: 'Per Item'
};

const ServicesManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({
    category: 'cuci_setrika',
    name: '',
    price: '',
    unit: 'kg',
    time_days: 0,
    time_hours: 0,
    type: 'reguler'
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  const token = localStorage.getItem('token');

  const fetchServices = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await axios.get('/api/services/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(res.data);
    } catch (err) {
      alert('Gagal memuat layanan: ' + (err.response?.data?.message || err.message));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      price: service.price_per_unit,
      unit: service.unit,
      time_days: service.time_days,
      time_hours: service.time_hours,
      type: service.type
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`/api/services/${id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Layanan berhasil diupdate');
      fetchServices(false);
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      alert('Gagal update: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      if (currentStatus) {
        // Nonaktifkan
        await axios.delete(`/api/services/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Layanan dinonaktifkan');
      } else {
        // Aktifkan kembali
        await axios.put(`/api/services/${id}/activate`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Layanan diaktifkan kembali');
      }
      fetchServices(false);
    } catch (err) {
      alert('Gagal: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    
    if (!newService.name || !newService.price) {
      return alert('Nama dan harga wajib diisi');
    }

    try {
      await axios.post('/api/services', newService, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Layanan berhasil ditambahkan');
      fetchServices(false);
      setShowAddForm(false);
      setNewService({
        category: 'cuci_setrika',
        name: '',
        price: '',
        unit: 'kg',
        time_days: 0,
        time_hours: 0,
        type: 'reguler'
      });
    } catch (err) {
      alert('Gagal menambah layanan: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getTimeDisplay = (days, hours) => {
    if (days > 0) return `${days} Hari`;
    if (hours > 0) return `${hours} Jam`;
    return '-';
  };

  // Filter services
  const filteredServices = services.filter(s => {
    const categoryMatch = filterCategory === 'all' || s.category === filterCategory;
    const activeMatch = showInactive || s.is_active === 1;
    return categoryMatch && activeMatch;
  });

  // Group by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <FiRefreshCw style={{ fontSize: '2rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        <p>Memuat layanan...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            <GiWashingMachine />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 800 }}>Kelola Layanan</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
              Atur harga dan detail layanan laundry
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '10px 20px',
            background: showAddForm ? '#ef4444' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.9rem'
          }}
        >
          {showAddForm ? <><FiX /> Batal</> : <><FiPlus /> Tambah Layanan</>}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          border: '2px solid #6366f1',
          boxShadow: '0 4px 20px rgba(99,102,241,0.15)'
        }}>
          <h3 style={{ marginTop: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiPlus /> Tambah Layanan Baru
          </h3>
          
          <form onSubmit={handleAddService}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Kategori
                </label>
                <select
                  value={newService.category}
                  onChange={e => setNewService({ ...newService, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="cuci_setrika">Cuci Setrika</option>
                  <option value="cuci_lipat">Cuci Lipat</option>
                  <option value="satuan">Satuan</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Nama Layanan
                </label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  placeholder="Contoh: Reguler 4 Hari"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                  placeholder="5000"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Satuan
                </label>
                <select
                  value={newService.unit}
                  onChange={e => setNewService({ ...newService, unit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="kg">Per Kg</option>
                  <option value="item">Per Item</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Estimasi (Hari)
                </label>
                <input
                  type="number"
                  value={newService.time_days}
                  onChange={e => setNewService({ ...newService, time_days: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Estimasi (Jam)
                </label>
                <input
                  type="number"
                  value={newService.time_hours}
                  onChange={e => setNewService({ ...newService, time_hours: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Tipe
                </label>
                <select
                  value={newService.type}
                  onChange={e => setNewService({ ...newService, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="reguler">Reguler</option>
                  <option value="express">Express</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: 16,
                padding: '10px 24px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FiCheck /> Simpan Layanan
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', marginRight: 8 }}>Filter:</label>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">Semua Kategori</option>
            <option value="cuci_setrika">Cuci Setrika</option>
            <option value="cuci_lipat">Cuci Lipat</option>
            <option value="satuan">Satuan</option>
          </select>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.85rem',
          cursor: 'pointer',
          color: '#64748b'
        }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          Tampilkan layanan nonaktif
        </label>

        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
          Total: <strong style={{ color: '#1e293b' }}>{filteredServices.length}</strong> layanan
        </div>
      </div>

      {/* Services List */}
      {Object.keys(groupedServices).length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <FiAlertCircle style={{ fontSize: '3rem', marginBottom: 12 }} />
          <p>Tidak ada layanan yang ditampilkan</p>
        </div>
      ) : (
        Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category} style={{ marginBottom: 32 }}>
            <h3 style={{
              color: '#1e293b',
              fontWeight: 700,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <FiPackage /> {categoryLabels[category]}
            </h3>

            <div style={{ display: 'grid', gap: 12 }}>
              {categoryServices.map(service => (
                <div
                  key={service.id}
                  style={{
                    background: service.is_active ? 'white' : '#f8fafc',
                    borderRadius: 12,
                    padding: 16,
                    border: `1.5px solid ${service.is_active ? '#e2e8f0' : '#cbd5e1'}`,
                    opacity: service.is_active ? 1 : 0.7
                  }}
                >
                  {editingId === service.id ? (
                    // Edit Mode
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                            Nama
                          </label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                            Harga
                          </label>
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                            Hari
                          </label>
                          <input
                            type="number"
                            value={editForm.time_days}
                            onChange={e => setEditForm({ ...editForm, time_days: parseInt(e.target.value) || 0 })}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
                            Jam
                          </label>
                          <input
                            type="number"
                            value={editForm.time_hours}
                            onChange={e => setEditForm({ ...editForm, time_hours: parseInt(e.target.value) || 0 })}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => saveEdit(service.id)}
                          style={{
                            padding: '6px 16px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <FiSave /> Simpan
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '6px 16px',
                            background: '#64748b',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <FiX /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: 12,
                            background: service.type === 'express' ? '#fef3c7' : '#dbeafe',
                            color: service.type === 'express' ? '#92400e' : '#1e40af',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{service.type === 'express' ? <><FiZap /> Express</> : <><FiPackage /> Reguler</>}</div>
                          </span>
                          {!service.is_active && (
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              background: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              NONAKTIF
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem', fontWeight: 700 }}>
                          {service.name}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                            <FiDollarSign style={{ fontSize: '0.8rem' }} /> Harga
                          </div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                            {formatPrice(service.price_per_unit)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/{unitLabels[service.unit]}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                            <FiClock style={{ fontSize: '0.8rem' }} /> Waktu
                          </div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                            {getTimeDisplay(service.time_days, service.time_hours)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => startEdit(service)}
                            style={{
                              padding: '8px 12px',
                              background: '#f1f5f9',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              color: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            <FiEdit2 /> Edit
                          </button>
                          <button
                            onClick={() => toggleActive(service.id, service.is_active)}
                            style={{
                              padding: '8px 12px',
                              background: service.is_active ? '#fee2e2' : '#dcfce7',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              color: service.is_active ? '#991b1b' : '#166534',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            {service.is_active ? <><FiEyeOff /> Nonaktifkan</> : <><FiEye /> Aktifkan</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ServicesManagement;