import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FiLayout, FiMessageCircle, FiPlus, FiTrash2, FiEdit2, FiMapPin,
  FiUsers, FiLock, FiX, FiSettings, FiSliders,
  FiDroplet, FiBriefcase, FiBox, FiPackage, FiActivity
} from 'react-icons/fi';
import { showSuccess, showError, showWarning, showConfirm, showLoading } from '../../../utils/swal';
import Swal from 'sweetalert2';
import { resolveFileUrl } from '../../../utils/api';

const iconOptions = [
  { name: 'Baju/Pakaian', value: 'FiPackage' },
  { name: 'Air/Basah', value: 'FiDroplet' },
  { name: 'Kotak/Sepatu', value: 'FiBox' },
  { name: 'Tas/Koper', value: 'FiBriefcase' },
  { name: 'Peralatan/Gear', value: 'FiSettings' },
  { name: 'Peta/Pin', value: 'FiMapPin' },
  { name: 'Pengguna', value: 'FiUser' },
];

const CMSTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('branding');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // CMS Content State
  const [branding, setBranding] = useState({
    storeName: 'Alinea Laundry',
    waNumber: '6287831197676',
    igLink: 'https://instagram.com/alinealaundry',
    tiktokLink: 'https://tiktok.com/@alinealaundry',
    storeAddress: 'Jl. Talangsari No.36A Semarang',
  });

  const [hero, setHero] = useState({
    heroTitle: 'Laundry Bersih, Wangi, & Praktis',
    heroSubtitle: 'Tanpa Keluar Rumah!',
    heroDescription: 'Gratis antar-jemput di seluruh area Semarang. Cukup order via website, kurir kami siap menjemput pakaian kotor Anda.',
    heroBgImage: '',
  });

  const [rules, setRules] = useState({
    operationalHours: 'Senin - Minggu: 08.00 - 20.00',
    freeDeliveryRule: 'Gratis antar-jemput maks 5 km di Semarang',
    storageFeeRule: 'Baju > 7 hari dikenakan Rp 2.000/hari',
  });

  const [promos, setPromos] = useState([]);
  const [layananList, setLayananList] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [faqs, setFaqs] = useState([]);

  // Shop Management State (Cabang & Staff)
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);

  // Modals & Forms State
  const [branchModal, setBranchModal] = useState(null); // { mode: 'add' } or { mode: 'edit', id, name, address }
  const [staffModal, setStaffModal] = useState(null); // { mode: 'add' } or { mode: 'edit', id, name, email, phone, role, branch_id }
  const [resetPasswordModal, setResetPasswordModal] = useState(null); // { id, name }

  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [newLayanan, setNewLayanan] = useState({ name: '', iconValue: 'FiPackage' });
  const [newTesti, setNewTesti] = useState({ name: '', text: '', stars: 5, avatar: '' });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch all CMS settings and management data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch CMS global JSON
      const cmsRes = await axios.get('/api/settings/home_content');
      if (cmsRes.data) {
        const d = cmsRes.data;
        if (d.storeName !== undefined) setBranding(prev => ({ ...prev, storeName: d.storeName, waNumber: d.waNumber || prev.waNumber, igLink: d.igLink || prev.igLink, tiktokLink: d.tiktokLink || prev.tiktokLink, storeAddress: d.storeAddress || prev.storeAddress }));
        if (d.heroTitle !== undefined) setHero(prev => ({ ...prev, heroTitle: d.heroTitle, heroSubtitle: d.heroSubtitle, heroDescription: d.heroDescription, heroBgImage: d.heroBgImage }));
        if (d.operationalHours !== undefined) setRules(prev => ({ ...prev, operationalHours: d.operationalHours, freeDeliveryRule: d.freeDeliveryRule, storageFeeRule: d.storageFeeRule }));
        setPromos(d.promoImages || []);
        setLayananList(d.layananList || []);
        setTestimonials(d.testimoniList || []);
        setFaqs(d.faqList || []);
      }

      // 2. Fetch branches and staff
      const [branchRes, staffRes] = await Promise.all([
        axios.get('/api/admin/branches', { headers: getHeaders() }),
        axios.get('/api/admin/staff', { headers: getHeaders() }),
      ]);
      setBranches(branchRes.data || []);
      setStaff(staffRes.data || []);

    } catch (err) {
      console.error('Error fetching CMS data:', err);
      showError('Gagal Memuat', 'Gagal memuat pengaturan CMS dan data operasional.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // General CMS Saver helper
  const saveCmsContent = async (updatedCms) => {
    showLoading('Menyimpan...', 'Sedang menyimpan perubahan...');
    try {
      // Dapatkan data saat ini terlebih dahulu
      const currentRes = await axios.get('/api/settings/home_content');
      const current = currentRes.data || {};
      
      const payload = {
        ...current,
        ...updatedCms
      };

      await axios.put('/api/settings/home_content', payload, { headers: getHeaders() });
      Swal.close();
      showSuccess('Disimpan', 'Perubahan konten berhasil disimpan dan dipasang ke beranda!');
    } catch (err) {
      Swal.close();
      showError('Gagal Menyimpan', err.response?.data?.message || 'Gagal menyimpan perubahan.');
    }
  };

  // Image Upload handler
  const handleImageUpload = async (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('photo', file);

    setUploading(true);
    showLoading('Mengunggah...', 'Sedang mengunggah gambar...');
    try {
      const res = await axios.post('/api/settings/upload', fd, {
        headers: {
          ...getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      callback(res.data.url);
      showSuccess('Berhasil', 'Gambar berhasil diunggah!');
    } catch (err) {
      showError('Gagal Unggah', err.response?.data?.message || 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  // --- BRANDING ACTIONS ---
  const handleSaveBranding = () => {
    saveCmsContent({ ...branding });
  };

  // --- HERO ACTIONS ---
  const handleSaveHero = () => {
    saveCmsContent({ ...hero });
  };

  // --- RULES ACTIONS ---
  const handleSaveRules = () => {
    saveCmsContent({ ...rules });
  };

  // --- PROMO BANNERS ---
  const handleAddPromo = (url) => {
    const updated = [...promos, { src: url, alt: 'Promo Banner' }];
    setPromos(updated);
    saveCmsContent({ promoImages: updated });
  };

  const handleDeletePromo = async (index) => {
    const confirm = await showConfirm('Hapus Promo', 'Apakah Anda yakin ingin menghapus banner promo ini?');
    if (!confirm.isConfirmed) return;

    const updated = promos.filter((_, i) => i !== index);
    setPromos(updated);
    saveCmsContent({ promoImages: updated });
  };

  // --- HOMEPAGE SERVICES ---
  const handleAddLayanan = () => {
    if (!newLayanan.name) return showWarning('Lengkapi Form', 'Nama layanan tidak boleh kosong');
    const updated = [...layananList, { name: newLayanan.name, iconValue: newLayanan.iconValue }];
    setLayananList(updated);
    saveCmsContent({ layananList: updated });
    setNewLayanan({ name: '', iconValue: 'FiPackage' });
  };

  const handleDeleteLayanan = (index) => {
    const updated = layananList.filter((_, i) => i !== index);
    setLayananList(updated);
    saveCmsContent({ layananList: updated });
  };

  // --- TESTIMONIALS ---
  const handleAddTesti = () => {
    if (!newTesti.name || !newTesti.text) {
      return showWarning('Lengkapi Form', 'Nama dan teks testimoni wajib diisi');
    }
    const updated = [
      ...testimonials,
      {
        name: newTesti.name,
        text: newTesti.text,
        stars: parseInt(newTesti.stars) || 5,
        img: newTesti.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newTesti.name)}&background=0284c7&color=fff`
      }
    ];
    setTestimonials(updated);
    saveCmsContent({ testimoniList: updated });
    setNewTesti({ name: '', text: '', stars: 5, avatar: '' });
  };

  const handleDeleteTesti = (index) => {
    const updated = testimonials.filter((_, i) => i !== index);
    setTestimonials(updated);
    saveCmsContent({ testimoniList: updated });
  };

  // --- FAQ ---
  const handleAddFaq = () => {
    if (!newFaq.q || !newFaq.a) {
      return showWarning('Lengkapi Form', 'Pertanyaan dan jawaban FAQ wajib diisi');
    }
    const updated = [...faqs, newFaq];
    setFaqs(updated);
    saveCmsContent({ faqList: updated });
    setNewFaq({ q: '', a: '' });
  };

  const handleDeleteFaq = (index) => {
    const updated = faqs.filter((_, i) => i !== index);
    setFaqs(updated);
    saveCmsContent({ faqList: updated });
  };

  // --- BRANCH MANAGEMENT ---
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    const { mode, id, name, address } = branchModal;
    if (!name) return;

    showLoading('Menyimpan...', 'Sedang menyimpan data cabang...');
    try {
      if (mode === 'add') {
        const res = await axios.post('/api/admin/branches', { name, address }, { headers: getHeaders() });
        setBranches(prev => [...prev, res.data]);
        showSuccess('Ditambahkan', 'Cabang baru berhasil didaftarkan!');
      } else {
        const res = await axios.put(`/api/admin/branches/${id}`, { name, address }, { headers: getHeaders() });
        setBranches(prev => prev.map(b => b.id === id ? res.data : b));
        showSuccess('Diperbarui', 'Informasi cabang berhasil diupdate!');
      }
      setBranchModal(null);
    } catch (err) {
      showError('Gagal', err.response?.data?.message || 'Gagal menyimpan cabang.');
    }
  };

  const toggleBranchActive = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const confirm = await showConfirm(
      newStatus ? 'Buka Cabang' : 'Tutup Cabang',
      newStatus
        ? 'Apakah Anda yakin ingin membuka kembali cabang ini? Pelanggan bisa melakukan order ke cabang ini.'
        : 'Apakah Anda yakin ingin menutup cabang ini? Cabang akan disembunyikan dari daftar pemesanan pelanggan.'
    );
    if (!confirm.isConfirmed) return;

    showLoading('Memproses...', 'Sedang mengubah status operasional cabang...');
    try {
      const res = await axios.put(`/api/admin/branches/${id}`, { is_active: newStatus }, { headers: getHeaders() });
      setBranches(prev => prev.map(b => b.id === id ? res.data : b));
      showSuccess('Berhasil', newStatus ? 'Cabang dibuka!' : 'Cabang ditutup sementara.');
    } catch (err) {
      showError('Gagal', 'Gagal merubah status cabang.');
    }
  };

  // --- STAFF MANAGEMENT ---
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const { mode, id, name, email, phone, role, branch_id, password } = staffModal;
    if (!name || !email || (mode === 'add' && !password)) return;

    showLoading('Menyimpan...', 'Sedang memproses data staff...');
    try {
      if (mode === 'add') {
        await axios.post('/api/admin/staff', {
          name, email, password, role, phone, branch_id
        }, { headers: getHeaders() });
        // Re-fetch full staff list to get branch_name via JOIN
        const staffRes = await axios.get('/api/admin/staff', { headers: getHeaders() });
        setStaff(staffRes.data || []);
        Swal.close();
        showSuccess('Ditambahkan', 'Staff/Admin baru berhasil didaftarkan!');
      } else {
        const res = await axios.put(`/api/admin/staff/${id}`, {
          name, email, phone, role, branch_id
        }, { headers: getHeaders() });
        setStaff(prev => prev.map(s => s.id === id ? { ...s, ...res.data } : s));
        Swal.close();
        showSuccess('Diperbarui', 'Informasi staff berhasil diperbarui!');
      }
      setStaffModal(null);
    } catch (err) {
      Swal.close();
      showError('Gagal', err.response?.data?.message || 'Gagal menyimpan data staff.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { id, password } = resetPasswordModal;
    if (!password) return;

    showLoading('Mereset...', 'Sedang mengganti password staff...');
    try {
      await axios.put(`/api/admin/staff/${id}`, { password }, { headers: getHeaders() });
      Swal.close();
      showSuccess('Sukses', 'Sandi staff berhasil di-reset!');
      setResetPasswordModal(null);
    } catch (err) {
      Swal.close();
      showError('Gagal', 'Gagal mereset sandi.');
    }
  };

  const toggleStaffActive = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const confirm = await showConfirm(
      newStatus ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
      newStatus
        ? 'Aktifkan kembali staff ini? Mereka akan bisa login ulang.'
        : 'Nonaktifkan akun staff ini? Sesi login aktif mereka akan ditendang dan mereka tidak akan bisa login lagi.'
    );
    if (!confirm.isConfirmed) return;

    showLoading('Memproses...', 'Sedang memproses perubahan status akun...');
    try {
      const res = await axios.put(`/api/admin/staff/${id}`, { is_active: newStatus }, { headers: getHeaders() });
      setStaff(prev => prev.map(s => s.id === id ? { ...s, is_active: res.data.is_active } : s));
      showSuccess('Berhasil', newStatus ? 'Akun staff diaktifkan kembali!' : 'Akun staff berhasil diblokir/dinonaktifkan.');
    } catch (err) {
      showError('Gagal', 'Gagal mengubah status aktif staff.');
    }
  };

  // Helper render icon
  const renderLayananIcon = (val) => {
    switch (val) {
      case 'FiDroplet': return <FiDroplet />;
      case 'FiBox': return <FiBox />;
      case 'FiBriefcase': return <FiBriefcase />;
      case 'FiMapPin': return <FiMapPin />;
      case 'FiSettings': return <FiSettings />;
      default: return <FiPackage />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
        <FiActivity style={{ fontSize: '2.5rem', animation: 'spin 2.5s linear infinite', marginBottom: 12, color: 'var(--blue)' }} />
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Menghubungkan ke CMS Global...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', marginTop: 16 }}>
      {/* Sub tabs navigation */}
      <div className="sub-tabs-container" style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 12,
        borderBottom: '1px solid #e2e8f0',
        marginBottom: 20
      }}>
        {[
          { id: 'branding', label: 'Branding & Kontak', icon: <FiSettings /> },
          { id: 'hero', label: 'Hero Banner', icon: <FiLayout /> },
          { id: 'rules', label: 'Aturan & Operasional', icon: <FiActivity /> },
          { id: 'promos', label: 'Slider Promo', icon: <FiSliders /> },
          { id: 'layanan_testi', label: 'Layanan & Testimoni', icon: <FiMessageCircle /> },
          { id: 'faq', label: 'Kelola FAQ 📋', icon: <FiMessageCircle /> },
          { id: 'branches', label: 'Kelola Cabang 🏬', icon: <FiMapPin /> },
          { id: 'staff', label: 'Kelola Staff 👥', icon: <FiUsers /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeSubTab === t.id ? 'var(--blue)' : '#f1f5f9',
              color: activeSubTab === t.id ? 'white' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* --- TAB: BRANDING --- */}
      {activeSubTab === 'branding' && (
        <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Informasi Branding &amp; Kontak</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Nama Toko / Laundry</label>
              <input
                type="text"
                className="input-custom-modern"
                value={branding.storeName}
                onChange={e => setBranding({ ...branding, storeName: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Nomor WhatsApp Bisnis (Format 62xxx)</label>
              <input
                type="text"
                className="input-custom-modern"
                value={branding.waNumber}
                onChange={e => setBranding({ ...branding, waNumber: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Instagram Link</label>
                <input
                  type="text"
                  value={branding.igLink}
                  onChange={e => setBranding({ ...branding, igLink: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>TikTok Link</label>
                <input
                  type="text"
                  value={branding.tiktokLink}
                  onChange={e => setBranding({ ...branding, tiktokLink: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Alamat Kantor Pusat</label>
              <textarea
                value={branding.storeAddress}
                onChange={e => setBranding({ ...branding, storeAddress: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveBranding} style={{ alignSelf: 'flex-start', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>
              Simpan Branding &amp; Kontak
            </button>
          </div>
        </div>
      )}

      {/* --- TAB: HERO --- */}
      {activeSubTab === 'hero' && (
        <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Hero Section beranda Utama</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Judul Utama Beranda (Title)</label>
              <input
                type="text"
                value={hero.heroTitle}
                onChange={e => setHero({ ...hero, heroTitle: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Subjudul Beranda (Subtitle)</label>
              <input
                type="text"
                value={hero.heroSubtitle}
                onChange={e => setHero({ ...hero, heroSubtitle: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Deskripsi Hero</label>
              <textarea
                value={hero.heroDescription}
                onChange={e => setHero({ ...hero, heroDescription: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveHero} style={{ alignSelf: 'flex-start', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>
              Simpan Hero Section
            </button>
          </div>
        </div>
      )}

      {/* --- TAB: RULES --- */}
      {activeSubTab === 'rules' && (
        <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Aturan &amp; Informasi Operasional</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Jam Kerja / Operasional Toko</label>
              <input
                type="text"
                value={rules.operationalHours}
                onChange={e => setRules({ ...rules, operationalHours: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Aturan Gratis Antar Jemput</label>
              <input
                type="text"
                value={rules.freeDeliveryRule}
                onChange={e => setRules({ ...rules, freeDeliveryRule: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Ketentuan Biaya Denda Penyimpanan</label>
              <input
                type="text"
                value={rules.storageFeeRule}
                onChange={e => setRules({ ...rules, storageFeeRule: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveRules} style={{ alignSelf: 'flex-start', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>
              Simpan Aturan Operasional
            </button>
          </div>
        </div>
      )}

      {/* --- TAB: PROMOS --- */}
      {activeSubTab === 'promos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 8px 0' }}>Tambah Banner Promo Baru</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px 0' }}>Gambar yang diunggah akan otomatis ditambahkan ke carousel promo di halaman beranda pelanggan.</p>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '30px 20px', textAlign: 'center', background: '#f8fafc' }}>
              <input
                type="file"
                id="promo-file"
                style={{ display: 'none' }}
                accept="image/*"
                onChange={e => handleImageUpload(e, handleAddPromo)}
                disabled={uploading}
              />
              <label htmlFor="promo-file" style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span className="btn btn-secondary" style={{ borderRadius: 10, fontWeight: 700 }}>Pilih File &amp; Unggah</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Maksimal file 5MB (Format JPG, PNG, WEBP)</span>
              </label>
            </div>
          </div>

          <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Daftar Banner Promo Aktif ({promos.length})</h3>
            {promos.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem', fontStyle: 'italic' }}>Belum ada promo aktif.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {promos.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: 12, border: '1px solid #cbd5e1', overflow: 'hidden', background: '#f1f5f9' }}>
                    <img src={resolveFileUrl(p.src)} alt={p.alt} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                    <div style={{ padding: 8, display: 'flex', justifyContent: 'flex-end', background: 'white' }}>
                      <button
                        onClick={() => handleDeletePromo(idx)}
                        style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        <FiTrash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: LAYANAN & TESTIMONI --- */}
      {activeSubTab === 'layanan_testi' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {/* Kelola Layanan Beranda */}
          <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Layanan Beranda Utama (Maksimal 12)</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nama Layanan Beranda</label>
                <input
                  type="text"
                  placeholder="Misal: Laundry Stroller"
                  value={newLayanan.name}
                  onChange={e => setNewLayanan({ ...newLayanan, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ minWidth: 150 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Pilih Ikon</label>
                <select
                  value={newLayanan.iconValue}
                  onChange={e => setNewLayanan({ ...newLayanan, iconValue: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white' }}
                >
                  {iconOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleAddLayanan} style={{ height: '42px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiPlus /> Tambah Layanan
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {layananList.map((l, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f1f5f9', borderRadius: 20, border: '1px solid #cbd5e1' }}>
                  <span style={{ display: 'flex', color: 'var(--blue)' }}>{renderLayananIcon(l.iconValue)}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{l.name}</span>
                  <button onClick={() => handleDeleteLayanan(idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }} title="Hapus">
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kelola Testimoni */}
          <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Manajemen Testimoni</h3>
            
            {/* Form Testi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 20, background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nama Pelanggan</label>
                  <input
                    type="text"
                    value={newTesti.name}
                    onChange={e => setNewTesti({ ...newTesti, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Bintang</label>
                  <select
                    value={newTesti.stars}
                    onChange={e => setNewTesti({ ...newTesti, stars: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white' }}
                  >
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Bintang</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Foto / Avatar (Opsional)</label>
                <input
                  type="file"
                  id="testi-file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e, url => setNewTesti(prev => ({ ...prev, avatar: url })))}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Ulasan Testimoni</label>
                <textarea
                  rows={2}
                  value={newTesti.text}
                  onChange={e => setNewTesti({ ...newTesti, text: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleAddTesti} style={{ alignSelf: 'flex-start', borderRadius: 10, fontWeight: 700 }}>
                Tambah Testimoni
              </button>
            </div>

            {/* List Testi */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {testimonials.map((t, idx) => (
                <div key={idx} style={{ padding: 16, border: '1.5px solid #e2e8f0', borderRadius: 12, background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <img src={resolveFileUrl(t.img)} alt={t.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.88rem' }}>{t.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#eab308' }}>{'★'.repeat(t.stars)}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', margin: '0 0 12px 0' }}>"{t.text}"</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTesti(idx)}
                    style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, alignSelf: 'flex-end' }}
                  >
                    <FiTrash2 size={12} /> Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: FAQ --- */}
      {activeSubTab === 'faq' && (
        <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24, marginTop: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: '0 0 16px 0' }}>Kelola FAQ Laundry</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Pertanyaan FAQ</label>
              <input
                type="text"
                placeholder="Misal: Berapa minimal berat cuci kiloan?"
                value={newFaq.q}
                onChange={e => setNewFaq({ ...newFaq, q: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Jawaban FAQ</label>
              <textarea
                rows={2}
                placeholder="Tulis penjelasan lengkap..."
                value={newFaq.a}
                onChange={e => setNewFaq({ ...newFaq, a: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleAddFaq} style={{ alignSelf: 'flex-start', borderRadius: 10, fontWeight: 700 }}>
              Tambah FAQ
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((f, idx) => (
              <div key={idx} style={{ padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>Q: {f.q}</strong>
                  <p style={{ fontSize: '0.82rem', color: '#475569', margin: '4px 0 0' }}>A: {f.a}</p>
                </div>
                <button
                  onClick={() => handleDeleteFaq(idx)}
                  style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex' }}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: BRANCHES --- */}
      {activeSubTab === 'branches' && (
        <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: 0 }}>Daftar Cabang Alinea Laundry</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>Kelola status buka/tutup dan tambahkan cabang outlet baru.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setBranchModal({ mode: 'add', name: '', address: '' })} style={{ borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiPlus /> Tambah Cabang
            </button>
          </div>

          <div className="table-responsive">
            <table className="table-admin-custom" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: 12, fontWeight: 800 }}>ID</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Nama Cabang</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Alamat Outlet</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Status Operasional</th>
                  <th style={{ padding: 12, fontWeight: 800, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>#{b.id}</td>
                    <td style={{ padding: 12, fontWeight: 700, color: 'var(--navy)' }}>{b.name}</td>
                    <td style={{ padding: 12, color: '#475569' }}>{b.address || 'Belum diisi'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: b.is_active !== false ? '#e6f4ea' : '#fde8e8',
                        color: b.is_active !== false ? '#137333' : '#c5221f'
                      }}>
                        {b.is_active !== false ? 'AKTIF (BUKA)' : 'TUTUP SEMENTARA'}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => setBranchModal({ mode: 'edit', id: b.id, name: b.name, address: b.address })}
                          style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
                          title="Edit Cabang"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => toggleBranchActive(b.id, b.is_active !== false)}
                          style={{
                            background: b.is_active !== false ? '#fde8e8' : '#e6f4ea',
                            color: b.is_active !== false ? '#ef4444' : '#0e9f6e',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          {b.is_active !== false ? 'TUTUP' : 'BUKA'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: STAFF --- */}
      {activeSubTab === 'staff' && (
        <div className="cms-card-glass" style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: 0 }}>Kelola Akun Staff &amp; Admin</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>Tambahkan admin cabang, kurir baru, reset password, atau tangguhkan akun staff.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setStaffModal({ mode: 'add', name: '', email: '', phone: '', role: 'courier', branch_id: '', password: '' })} style={{ borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiPlus /> Tambah Staff Baru
            </button>
          </div>

          <div className="table-responsive">
            <table className="table-admin-custom" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: 12, fontWeight: 800 }}>ID</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Nama Staff</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Email</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Peran / Role</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Penugasan Cabang</th>
                  <th style={{ padding: 12, fontWeight: 800 }}>Status</th>
                  <th style={{ padding: 12, fontWeight: 800, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>#{s.id}</td>
                    <td style={{ padding: 12, fontWeight: 700, color: 'var(--navy)' }}>{s.name}</td>
                    <td style={{ padding: 12, color: '#475569' }}>{s.email}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: s.role === 'admin' ? '#e0e7ff' : '#fef3c7',
                        color: s.role === 'admin' ? '#3730a3' : '#92400e'
                      }}>
                        {s.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{s.branch_name || <span style={{ color: '#0369a1' }}>Global (Super)</span>}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: s.is_active !== false ? '#e6f4ea' : '#fde8e8',
                        color: s.is_active !== false ? '#137333' : '#c5221f'
                      }}>
                        {s.is_active !== false ? 'AKTIF' : 'DIBLOKIR'}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => setStaffModal({ mode: 'edit', id: s.id, name: s.name, email: s.email, phone: s.phone || '', role: s.role, branch_id: s.branch_id || '' })}
                          style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
                          title="Edit Profil Staff"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => setResetPasswordModal({ id: s.id, name: s.name, password: '' })}
                          style={{ background: '#f3e8ff', color: '#6b21a8', border: 'none', padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
                          title="Ganti Password Staff"
                        >
                          <FiLock size={13} />
                        </button>
                        <button
                          onClick={() => toggleStaffActive(s.id, s.is_active !== false)}
                          style={{
                            background: s.is_active !== false ? '#fde8e8' : '#e6f4ea',
                            color: s.is_active !== false ? '#ef4444' : '#0e9f6e',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          {s.is_active !== false ? 'BLOKIR' : 'AKTIFKAN'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL: BRANCH --- */}
      {branchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: '450px', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: 0 }}>
                {branchModal.mode === 'add' ? 'Tambah Cabang Baru' : 'Edit Cabang'}
              </h3>
              <button onClick={() => setBranchModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSaveBranch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nama Cabang</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Tlogosari"
                  value={branchModal.name}
                  onChange={e => setBranchModal({ ...branchModal, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Alamat Lengkap</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Misal: Jl. Tlogosari Raya No. 78, Semarang"
                  value={branchModal.address}
                  onChange={e => setBranchModal({ ...branchModal, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setBranchModal(null)} style={{ flex: 1, borderRadius: 10, fontWeight: 700 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, borderRadius: 10, fontWeight: 700 }}>Simpan Cabang</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: STAFF --- */}
      {staffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: '450px', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: 0 }}>
                {staffModal.mode === 'add' ? 'Registrasi Staff Baru' : 'Edit Profil Staff'}
              </h3>
              <button onClick={() => setStaffModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={staffModal.name}
                  onChange={e => setStaffModal({ ...staffModal, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  required
                  value={staffModal.email}
                  onChange={e => setStaffModal({ ...staffModal, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              {staffModal.mode === 'add' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Sandi / Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={staffModal.password}
                    onChange={e => setStaffModal({ ...staffModal, password: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nomor Handphone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Misal: 081227884650"
                  value={staffModal.phone}
                  onChange={e => setStaffModal({ ...staffModal, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Hak Akses (Role)</label>
                  <select
                    value={staffModal.role}
                    onChange={e => setStaffModal({ ...staffModal, role: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white' }}
                  >
                    <option value="courier">Kurir</option>
                    <option value="admin">Admin Cabang</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Penempatan Cabang</label>
                  <select
                    value={staffModal.branch_id}
                    onChange={e => setStaffModal({ ...staffModal, branch_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white' }}
                  >
                    <option value="">Global / Pusat</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStaffModal(null)} style={{ flex: 1, borderRadius: 10, fontWeight: 700 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, borderRadius: 10, fontWeight: 700 }}>Simpan Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: RESET PASSWORD --- */}
      {resetPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: '400px', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', margin: 0 }}>Reset Sandi Staff</h3>
              <button onClick={() => setResetPasswordModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><FiX size={20} /></button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
              Ubah sandi login untuk staff <strong>{resetPasswordModal.name}</strong>:
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Sandi / Password Baru</label>
                <input
                  type="password"
                  required
                  placeholder="Ketik minimal 6 karakter"
                  value={resetPasswordModal.password}
                  onChange={e => setResetPasswordModal({ ...resetPasswordModal, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResetPasswordModal(null)} style={{ flex: 1, borderRadius: 10, fontWeight: 700 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, borderRadius: 10, fontWeight: 700 }}>Simpan Sandi Baru</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CMSTab;
