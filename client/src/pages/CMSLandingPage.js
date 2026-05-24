import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSave, FiPlus, FiTrash2, FiImage, FiSettings } from 'react-icons/fi';
import { showSuccess, showError, showLoading } from '../utils/swal';
import PhotoUploader from '../components/PhotoUploader';

const CMSLandingPage = () => {
  const token = localStorage.getItem('token');
  const h = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState({
    heroTitle: 'Laundry Bersih, Wangi, & Praktis',
    heroSubtitle: 'Tanpa Keluar Rumah!',
    waNumber: '6281234567890',
    igLink: 'https://instagram.com/alinealaundry',
    tiktokLink: 'https://tiktok.com/@alinealaundry',
    marqueeText: [
      { icon: 'FiClock', text: 'Buka 24 Jam' },
      { icon: 'FiMapPin', text: 'Gratis Ongkir Semarang Kota' },
      { icon: 'FiTruck', text: 'Layanan Antar Jemput Cepat' },
      { icon: 'none', text: '#LaundryMudahLewatWebAlineaLaundry' }
    ],
    promoImages: [
      { src: '/images/alineapromo1.webp', alt: 'Promo 1' },
      { src: '/images/alineapromo2.webp', alt: 'Promo 2' },
      { src: '/images/alineapromo3.webp', alt: 'Promo 3' }
    ],
    parfumList: [
      { name: 'Lavender', desc: 'Aroma calming dan relaxing cocok untuk pakaian harian.', tag: 'Rp 300.000', img: '/images/parfum-lavender.webp' },
      { name: 'Sakura', desc: 'Floral premium ala Jepang wangi lembut & feminin.', tag: 'Rp 300.000', img: '/images/parfum-sakura.webp' },
      { name: 'Ocean Fresh', desc: 'Fresh clean seperti linen hotel dan terasa lebih mewah.', tag: 'Rp 300.000', img: '/images/parfum-ocean.webp' },
      { name: 'Vanilla', desc: 'Sweet creamy yang hangat dan elegan sepanjang hari.', tag: 'Rp 300.000', img: '/images/parfum-vanilla.webp' }
    ]
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings/home_content');
      if (res.data) {
        // Gabungkan dengan default properties jika ada yang kurang (misal tiktokLink baru ditambah)
        setContent(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.log('Settings not found or error, using default');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      showLoading('Menyimpan pengaturan...');
      await axios.put('/api/settings/home_content', content, { headers: h });
      showSuccess('Pengaturan berhasil disimpan!');
    } catch (err) {
      showError('Gagal menyimpan pengaturan');
    }
  };

  // MARQUEE HANDLER
  const handleAddMarquee = () => {
    setContent(prev => ({
      ...prev,
      marqueeText: [...(prev.marqueeText || []), { icon: 'none', text: 'Teks Baru' }]
    }));
  };
  const handleRemoveMarquee = (idx) => {
    const newM = [...content.marqueeText];
    newM.splice(idx, 1);
    setContent({ ...content, marqueeText: newM });
  };

  // PROMO IMAGES HANDLER
  const handleAddPromo = () => {
    setContent(prev => ({
      ...prev,
      promoImages: [...prev.promoImages, { src: '', alt: 'Promo Baru' }]
    }));
  };
  const handleRemovePromo = (idx) => {
    const newPromos = [...content.promoImages];
    newPromos.splice(idx, 1);
    setContent({ ...content, promoImages: newPromos });
  };
  const handlePromoUpload = async (file, idx) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await axios.post('/api/settings/upload', formData, { headers: h });
      const newPromos = [...content.promoImages];
      newPromos[idx].src = res.data.url;
      setContent({ ...content, promoImages: newPromos });
    } catch (err) {
      showError('Gagal upload gambar');
    }
  };

  // PARFUM HANDLER
  const handleAddParfum = () => {
    setContent(prev => ({
      ...prev,
      parfumList: [...prev.parfumList, { name: 'Parfum Baru', desc: 'Deskripsi', tag: 'Rp 0', img: '' }]
    }));
  };
  const handleRemoveParfum = (idx) => {
    const newList = [...content.parfumList];
    newList.splice(idx, 1);
    setContent({ ...content, parfumList: newList });
  };
  const handleParfumUpload = async (file, idx) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await axios.post('/api/settings/upload', formData, { headers: h });
      const newList = [...content.parfumList];
      newList[idx].img = res.data.url;
      setContent({ ...content, parfumList: newList });
    } catch (err) {
      showError('Gagal upload gambar');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Memuat CMS...</div>;

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            <FiSettings style={{ marginRight: 8 }} /> Manajemen Konten Landing Page
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>Ubah teks, promo, dan info parfum di halaman utama.</p>
        </div>
        <button className="btn" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiSave /> Simpan Perubahan
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Teks Hero */}
        <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Teks Utama (Hero)</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Judul Besar (H1)</label>
            <input className="form-input" value={content.heroTitle} onChange={e => setContent({...content, heroTitle: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Sub Judul</label>
            <input className="form-input" value={content.heroSubtitle} onChange={e => setContent({...content, heroSubtitle: e.target.value})} />
          </div>
        </div>

        {/* Sosial & Kontak */}
        <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Sosial Media & Kontak</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nomor WhatsApp (Gunakan kode negara, misal: 628...)</label>
            <input className="form-input" value={content.waNumber} onChange={e => setContent({...content, waNumber: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Link URL Instagram</label>
            <input className="form-input" value={content.igLink} onChange={e => setContent({...content, igLink: e.target.value})} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Link URL TikTok</label>
            <input className="form-input" value={content.tiktokLink} onChange={e => setContent({...content, tiktokLink: e.target.value})} />
          </div>
        </div>

        {/* Teks Berjalan (Marquee) */}
        <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Teks Berjalan (Marquee Atas)</h3>
            <button className="btn btn-sm btn-secondary" onClick={handleAddMarquee}><FiPlus /> Tambah Teks</button>
          </div>
          
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
            {(content.marqueeText || []).map((mq, idx) => (
              <div key={idx} style={{ flex: '0 0 250px', border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, position: 'relative' }}>
                <button onClick={() => handleRemoveMarquee(idx)} style={{ position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}><FiTrash2 /></button>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ikon (Nama Fi...)</label>
                  <input className="form-input" value={mq.icon} onChange={e => {
                    const newM = [...content.marqueeText]; newM[idx].icon = e.target.value; setContent({...content, marqueeText: newM});
                  }} placeholder="Misal: FiClock, FiTruck" />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Teks</label>
                  <input className="form-input" value={mq.text} onChange={e => {
                    const newM = [...content.marqueeText]; newM[idx].text = e.target.value; setContent({...content, marqueeText: newM});
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gambar Promo */}
        <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}><FiImage /> Slider Banner Promo</h3>
            <button className="btn btn-sm btn-secondary" onClick={handleAddPromo}><FiPlus /> Tambah Promo</button>
          </div>
          
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
            {content.promoImages.map((promo, idx) => (
              <div key={idx} style={{ flex: '0 0 300px', border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, position: 'relative' }}>
                <button onClick={() => handleRemovePromo(idx)} style={{ position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}><FiTrash2 /></button>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Teks Alt Gambar</label>
                  <input className="form-input" value={promo.alt} onChange={e => {
                    const newP = [...content.promoImages]; newP[idx].alt = e.target.value; setContent({...content, promoImages: newP});
                  }} />
                </div>

                <div style={{ marginBottom: 8, height: 120, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {promo.src ? <img src={promo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiImage style={{ fontSize: '2rem', color: '#cbd5e1' }}/>}
                </div>
                
                <PhotoUploader label="Upload/Ganti Gambar" onPhoto={(file) => handlePromoUpload(file, idx)} />
              </div>
            ))}
          </div>
        </div>

        {/* Daftar Parfum */}
        <div style={{ background: 'white', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Daftar Pilihan Parfum</h3>
            <button className="btn btn-sm btn-secondary" onClick={handleAddParfum}><FiPlus /> Tambah Parfum</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {content.parfumList.map((parfum, idx) => (
              <div key={idx} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, position: 'relative' }}>
                <button onClick={() => handleRemoveParfum(idx)} style={{ position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}><FiTrash2 /></button>
                
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nama Parfum</label>
                  <input className="form-input" value={parfum.name} onChange={e => {
                    const newP = [...content.parfumList]; newP[idx].name = e.target.value; setContent({...content, parfumList: newP});
                  }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tag Harga/Promo</label>
                  <input className="form-input" value={parfum.tag} onChange={e => {
                    const newP = [...content.parfumList]; newP[idx].tag = e.target.value; setContent({...content, parfumList: newP});
                  }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Deskripsi Aroma</label>
                  <textarea rows={2} className="form-input" value={parfum.desc} onChange={e => {
                    const newP = [...content.parfumList]; newP[idx].desc = e.target.value; setContent({...content, parfumList: newP});
                  }} />
                </div>

                <div style={{ marginBottom: 8, height: 120, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {parfum.img ? <img src={parfum.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiImage style={{ fontSize: '2rem', color: '#cbd5e1' }}/>}
                </div>
                
                <PhotoUploader label="Gambar Parfum" onPhoto={(file) => handleParfumUpload(file, idx)} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CMSLandingPage;
