import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { showSuccess, showError, showWarning } from '../utils/swal';
import {
  FiEdit2, FiPlus, FiCheck, FiX, FiSave, FiRefreshCw,
  FiClock, FiDollarSign, FiPackage, FiAlertCircle, FiEye, FiEyeOff, FiZap,
  FiChevronDown, FiCheckCircle
} from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';

const categoryLabels = {
  cuci_setrika: 'Cuci Setrika',
  cuci_lipat: 'Cuci Lipat',
  satuan: 'Layanan Satuan'
};


const unitLabels = {
  kg: 'kg',
  item: 'pcs'
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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.branch_id === null;

  const fetchServices = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await axios.get('/api/services/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(res.data);
    } catch (err) {
      showError('Gagal Memuat', 'Gagal memuat layanan laundry: ' + (err.response?.data?.message || err.message));
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
      unit: service.unit_type,
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
      showSuccess('Layanan Diperbarui', 'Layanan laundry berhasil diperbarui!');
      fetchServices(false);
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      showError('Gagal Memperbarui', 'Gagal memperbarui layanan: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      if (currentStatus) {
        // Nonaktifkan
        await axios.delete(`/api/services/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccess('Layanan Nonaktif', 'Layanan laundry berhasil dinonaktifkan.');
      } else {
        // Aktifkan kembali
        await axios.put(`/api/services/${id}/activate`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccess('Layanan Aktif', 'Layanan laundry berhasil diaktifkan kembali!');
      }
      fetchServices(false);
    } catch (err) {
      showError('Gagal Mengubah', 'Gagal mengubah status layanan: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    
    if (!newService.name || !newService.price) {
      return showWarning('Nama & Harga Wajib', 'Nama layanan dan harga wajib diisi!');
    }

    const payload = {
      ...newService,
      time_days: newService.category === 'satuan' ? 0 : newService.time_days,
      time_hours: newService.category === 'satuan' ? 0 : newService.time_hours,
      type: newService.category === 'satuan' ? 'reguler' : newService.type
    };

    try {
      await axios.post('/api/services', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Layanan Ditambahkan', 'Layanan laundry baru berhasil ditambahkan!');
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
      showError('Gagal Menambah', 'Gagal menambahkan layanan baru: ' + (err.response?.data?.message || err.message));
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
    const activeMatch = showInactive || s.is_active === true || s.is_active === 1;
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
        
        {isSuperAdmin && (
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
        )}
      </div>

      {/* Add Form */}
      {showAddForm && isSuperAdmin && (
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
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      setCatDropdownOpen(!catDropdownOpen);
                      setUnitDropdownOpen(false);
                      setTypeDropdownOpen(false);
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
                    <span>{categoryLabels[newService.category] || newService.category}</span>
                    <FiChevronDown style={{ 
                      color: '#64748b', 
                      transition: 'transform 0.2s',
                      transform: catDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                    }} />
                  </div>

                  {catDropdownOpen && (
                    <>
                      <div 
                        onClick={() => setCatDropdownOpen(false)}
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
                          { value: 'cuci_setrika', label: 'Cuci Setrika' },
                          { value: 'cuci_lipat', label: 'Cuci Lipat' },
                          { value: 'satuan', label: 'Satuan' }
                        ].map(opt => {
                          const isSelected = newService.category === opt.value;
                          return (
                            <div
                              key={opt.value}
                              onClick={() => {
                                setNewService({ 
                                  ...newService, 
                                  category: opt.value,
                                  unit: opt.value === 'satuan' ? 'item' : 'kg'
                                });
                                setCatDropdownOpen(false);
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
                      fontSize: '0.9rem',
                      height: '38px'
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
                      fontSize: '0.9rem',
                      height: '38px'
                    }}
                    required
                  />
                </div>
  
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Satuan
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => {
                        setUnitDropdownOpen(!unitDropdownOpen);
                        setCatDropdownOpen(false);
                        setTypeDropdownOpen(false);
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
                      <span>{newService.unit === 'kg' ? 'Per Kg' : 'Per Item'}</span>
                      <FiChevronDown style={{ 
                        color: '#64748b', 
                        transition: 'transform 0.2s',
                        transform: unitDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                      }} />
                    </div>
  
                    {unitDropdownOpen && (
                      <>
                        <div 
                          onClick={() => setUnitDropdownOpen(false)}
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
                            { value: 'kg', label: 'Per Kg' },
                            { value: 'item', label: 'Per Item' }
                          ].map(opt => {
                            const isSelected = newService.unit === opt.value;
                            return (
                              <div
                                key={opt.value}
                                onClick={() => {
                                  setNewService({ ...newService, unit: opt.value });
                                  setUnitDropdownOpen(false);
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
  
                {newService.category !== 'satuan' && (
                  <>
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
                          fontSize: '0.9rem',
                          height: '38px'
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
                          fontSize: '0.9rem',
                          height: '38px'
                        }}
                      />
                    </div>
  
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Tipe
                      </label>
                      <div style={{ position: 'relative' }}>
                        <div
                          onClick={() => {
                            setTypeDropdownOpen(!typeDropdownOpen);
                            setCatDropdownOpen(false);
                            setUnitDropdownOpen(false);
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
                          <span style={{ textTransform: 'capitalize' }}>{newService.type}</span>
                          <FiChevronDown style={{ 
                            color: '#64748b', 
                            transition: 'transform 0.2s',
                            transform: typeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
                          }} />
                        </div>
  
                        {typeDropdownOpen && (
                          <>
                            <div 
                              onClick={() => setTypeDropdownOpen(false)}
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
                                const isSelected = newService.type === opt.value;
                                return (
                                  <div
                                    key={opt.value}
                                    onClick={() => {
                                      setNewService({ ...newService, type: opt.value });
                                      setTypeDropdownOpen(false);
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
                  </>
                )}
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
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>Filter Kategori:</label>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1.5px solid #e2e8f0',
                background: 'white',
                color: 'var(--navy)',
                fontWeight: 600,
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                minWidth: '160px'
              }}
            >
              <span>
                {filterCategory === 'all' && 'Semua Kategori'}
                {filterCategory === 'cuci_setrika' && 'Cuci Setrika'}
                {filterCategory === 'cuci_lipat' && 'Cuci Lipat'}
                {filterCategory === 'satuan' && 'Satuan'}
              </span>
              <FiChevronDown style={{ 
                transition: 'transform 0.2s', 
                transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' 
              }} />
            </button>

            {isCategoryDropdownOpen && (
              <>
                <div 
                  onClick={() => setIsCategoryDropdownOpen(false)} 
                  style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    background: 'white',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--sh-lg)',
                    padding: '6px',
                    zIndex: 999,
                    minWidth: '180px',
                    animation: 'slideUp 0.15s ease-out'
                  }}
                >
                  {[
                    { value: 'all', label: 'Semua Kategori' },
                    { value: 'cuci_setrika', label: 'Cuci Setrika' },
                    { value: 'cuci_lipat', label: 'Cuci Lipat' },
                    { value: 'satuan', label: 'Satuan' }
                  ].map(c => {
                    const isSelected = c.value === filterCategory;
                    return (
                      <button
                        key={c.value}
                        onClick={() => {
                          setFilterCategory(c.value);
                          setIsCategoryDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: isSelected ? 'var(--sky-pale)' : 'transparent',
                          color: isSelected ? 'var(--blue)' : 'var(--text-2)',
                          border: 'none',
                          borderRadius: '6px',
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
                        <span>{c.label}</span>
                        {isSelected && <FiCheckCircle size={14} style={{ color: 'var(--blue)' }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.85rem',
          cursor: 'pointer',
          color: '#64748b',
          whiteSpace: 'nowrap'
        }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          Tampilkan layanan nonaktif
        </label>

        <div style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
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

                        {service.category !== 'satuan' && (
                          <>
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
                          </>
                        )}
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
                          {service.category !== 'satuan' && (
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
                          )}
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
                            {formatPrice(service.price_per_unit)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/{unitLabels[service.unit_type] || service.unit_type}</span>
                          </div>
                        </div>

                        {service.category !== 'satuan' && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                              <FiClock style={{ fontSize: '0.8rem' }} /> Waktu
                            </div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                              {getTimeDisplay(service.time_days, service.time_hours)}
                            </div>
                          </div>
                        )}

                        {isSuperAdmin && (
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
                        )}
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