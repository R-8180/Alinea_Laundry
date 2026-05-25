import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import FloatingWA from '../components/FloatingWA';
import InstallPWA from '../components/InstallPWA';
import {
  FiPackage, FiDroplet, FiBox, FiBriefcase, FiHeart,
  FiShield, FiSettings, FiTool,
  FiWatch, FiStar, FiClock, FiTruck, FiMapPin, FiSearch, FiPlus, FiMinus, FiUser, FiClipboard, FiCheckCircle, FiCreditCard, FiMessageCircle, FiUserPlus, FiPlay
} from 'react-icons/fi';
import { FaWhatsapp, FaInstagram, FaTiktok } from 'react-icons/fa';

/* ========== DATA ========== */
const layananList = [
  { icon: <FiPackage />, name: 'Dry Clean' },
  { icon: <FiDroplet />, name: 'Wet Clean' },
  { icon: <FiBox />, name: 'Laundry Sepatu' },
  { icon: <FiBriefcase />, name: 'Laundry Tas' },
  { icon: <FiSettings />, name: 'Laundry Kiloan' },
  { icon: <FiHeart />, name: 'Perlengkapan Bayi' },
  { icon: <FiShield />, name: 'Laundry Helm' },
  { icon: <FiTool />, name: 'Semir Sepatu' },
  { icon: <FiSettings />, name: 'Alterations & Repair' },
  { icon: <FiWatch />, name: 'Laundry Peralatan Diving' },
  { icon: <FiPlus />, name: 'Laundry Stroller' },
  { icon: <FiMapPin />, name: 'Laundry Peralatan Gunung' },
];

const promoImages = [
  { src: '/images/alineapromo1.webp', alt: 'Promo 1' },
  { src: '/images/alineapromo2.webp', alt: 'Promo 2' },
  { src: '/images/alineapromo3.webp', alt: 'Promo 3' },
];

const parfumList = [
  { name: 'Lavender', img: '/images/parfum-lavender.webp', desc: 'Aroma calming dan relaxing cocok untuk pakaian harian.', tag: 'Rp 300.000' },
  { name: 'Sakura', img: '/images/parfum-sakura.webp', desc: 'Floral premium ala Jepang wangi lembut & feminin.', tag: 'Rp 300.000' },
  { name: 'Ocean Fresh', img: '/images/parfum-ocean.webp', desc: 'Fresh clean seperti linen hotel dan terasa lebih mewah.', tag: 'Rp 300.000' },
  { name: 'Vanilla', img: '/images/parfum-vanilla.webp', desc: 'Sweet creamy yang hangat dan elegan sepanjang hari.', tag: 'Rp 300.000' },
];

const faqList = [
  { q: 'Apa yang terjadi jika barang tertinggal di saku?', a: 'Kami akan menyimpan barang yang tertinggal dan menghubungi Anda untuk pengambilan.' },
  { q: 'Tarif Pickup & Delivery', a: 'Gratis untuk area Semarang, ongkir maksimal 5 kg.' },
  { q: 'Apakah saya mendapatkan tanda terima pesanan saya?', a: 'Ya, Anda bisa melihat detail pesanan dan kode order di dashboard.' },
  { q: 'Ketentuan Biaya Penyimpanan', a: 'Pakaian yang tidak diambil lebih dari 7 hari akan dikenakan biaya penyimpanan Rp 2.000/hari.' },
  { q: 'Estimasi Berapa lama?', a: 'Reguler 4-5 hari, Express 2-3 hari. Admin akan memberikan estimasi jam.' },
  { q: 'Apakah ada garansi jika hasilnya kurang maksimal?', a: 'Kami siap mencuci ulang secara gratis jika hasil tidak sesuai.' },
  { q: 'Metode Pembayaran', a: 'Saat ini hanya QRIS. Anda bisa upload bukti pembayaran.' },
  { q: 'Apa yang harus saya persiapkan untuk Pickup?', a: 'Pastikan pakaian sudah dikemas dalam kantong atau tas.' },
  { q: 'Saya ragu cara mencucinya', a: 'Tenang, kami akan mencuci sesuai jenis bahan. Anda bisa menambahkan catatan.' },
  { q: 'Berapa persentase keberhasilan untuk menghilangkan noda luntur baru?', a: 'Sekitar 90% tergantung jenis noda dan bahan.' },
  { q: 'Area Pelayanan (Covered Area) Alinea Laundry', a: 'Kami melayani penjemputan dan pengantaran ke seluruh wilayah Semarang dan sekitarnya.' },
  { q: 'Apakah ada layanan antar jemput di hari Minggu?', a: 'Ya, kami tetap beroperasi di hari Minggu pukul 09.00-15.00.' },
  { q: 'Bagaimana jika cucian rusak?', a: 'Kami memiliki asuransi kerusakan. Hubungi admin segera.' },
  { q: 'Apakah bisa request parfum khusus?', a: 'Tentu, silakan tulis di catatan atau hubungi CS kami.' },
  { q: 'Berapa minimal order?', a: 'Tidak ada minimal order, Anda bisa laundry 1 item saja.' },
];

export const CMSContext = React.createContext();

/* ========== KOMPONEN ========== */
const ScrollProgressBar = () => {
  const [scrollW, setScrollW] = useState('0%');

  useEffect(() => {
    let rafId = null;

    const handleScroll = () => {
      // Batalkan frame sebelumnya jika scroll masih terus terjadi
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const totalScroll = document.documentElement.scrollTop;
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (windowHeight <= 0) return;
        const scroll = `${(totalScroll / windowHeight) * 100}%`;
        setScrollW(scroll);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="scroll-progress-container">
      <div className="scroll-progress-fill" style={{ width: scrollW }}></div>
    </div>
  );
};



const HeroWithTrack = () => {
  const cms = React.useContext(CMSContext);
  const [orderCode, setOrderCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderCode) return;
    try {
      const res = await axios.get(`/api/track/${orderCode}`);
      setResult(res.data);
      setError('');
    } catch { 
      setError('Order tidak ditemukan'); 
      setResult(null); 
    }
  };

  const statusMap = {
    menunggu: <><FiClock /> Menunggu dipickup</>,
    pickup: <><FiTruck /> Sedang dipickup</>,
    proses: <><FiSettings /> Sedang diproses</>,
    antar: <><FiPackage /> Sedang diantar</>,
    selesai: <><FiCheckCircle /> Selesai</>,
  };

  return (
    <section className="hero-new">
      <div className="hero-bg-anim"></div>
      <div className="hero-shape-1"></div>
      <div className="hero-shape-2"></div>
      
      <div className="hero-content-wrapper">
        <span className="hero-badge"> Laundry Express Semarang 24 Jam</span>
        <h1 className="hero-title-new">{cms?.heroTitle || 'Laundry Bersih, Wangi, & Praktis'}</h1>
        <p className="hero-subtitle-new">{cms?.heroSubtitle || 'Tanpa Keluar Rumah!'}</p>
        <p className="hero-description-new">
          Gratis antar-jemput di seluruh area Semarang. Cukup order via website, kurir kami siap menjemput pakaian kotor Anda kapan saja, tanpa perlu repot keluar rumah.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn hero-btn-primary">Mulai Laundry Sekarang</Link>
        </div>

        {/* Integrated Track Order */}
        <div id="track" className="hero-track-glass">
          <h3><FiSearch /> Lacak Pesanan Kamu</h3>
          <form onSubmit={handleTrack} className="track-form-glass">
            <input 
              type="text" 
              placeholder="Masukkan Kode Order (contoh: ORD-240604-AB3F)" 
              value={orderCode} 
              onChange={e => setOrderCode(e.target.value)} 
              required 
            />
            <button type="submit">Lacak</button>
          </form>
          {result && (
            <div className="track-result-glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>Kode: {result.order_code}</strong>
                <span style={{ color: 'var(--sky)' }}>{statusMap[result.status] || result.status}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                Pembayaran: <strong style={{ color: result.payment_status === 'paid' ? '#86efac' : '#fde68a' }}>{result.payment_status === 'paid' ? 'Lunas' : 'Menunggu'}</strong>
              </div>
            </div>
          )}
          {error && <div style={{ color: '#fca5a5', marginTop: 12, fontSize: '0.9rem' }}>{error}</div>}
        </div>
      </div>
    </section>
  );
};

const PromoSlider = () => {
  const cms = React.useContext(CMSContext);
  const currentPromoImages = cms?.promoImages?.length ? cms.promoImages : promoImages;
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const total = currentPromoImages.length;

  // Deteksi ukuran layar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const autoNext = useCallback(() => setCurrent(prev => (prev + 1) % total), [total]);
  useEffect(() => {
    const t = setInterval(autoNext, 3000);
    return () => clearInterval(t);
  }, [autoNext]);

  // Mode Mobile: 1 slide dengan aspect ratio 16:9
  if (isMobile) {
    return (
      <section className="section reveal promo-top">
        <h2 className="section-title">Promo Spesial</h2>
        <div className="promo-slider-mobile-viewport">
          <div
            className="promo-slider-mobile-track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {currentPromoImages.map((img, idx) => (
              <div
                key={idx}
                className="promo-slide-mobile-item"
              >
                <img src={img.src} alt={img.alt} style={{ width: '100%', display: 'block', borderRadius: 16 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="promo-dots-mobile">
          {currentPromoImages.map((_, idx) => (
            <button
              key={idx}
              className={`promo-dot-mobile ${idx === current ? 'active' : ''}`}
              onClick={() => setCurrent(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>
    );
  }

  // Mode Desktop: Coverflow
  const prevIdx = (current - 1 + total) % total;
  const nextIdx = (current + 1) % total;

  return (
    <section className="section reveal promo-top">
      <h2 className="section-title">Promo Spesial</h2>
      <div className="promo-coverflow">
        <div className="promo-coverflow-stage">
          {currentPromoImages.map((img, idx) => {
            let className = 'promo-coverflow-item';
            if (idx === current) className += ' active';
            else if (idx === prevIdx) className += ' prev';
            else if (idx === nextIdx) className += ' next';
            else className += ' hidden';
            return (
              <div
                key={idx}
                className={className}
                style={{ backgroundImage: `url(${img.src})` }}
                onClick={() => { if (idx !== current) setCurrent(idx); }}
              />
            );
          })}
        </div>
      </div>
      <div className="promo-dots-custom" style={{ marginTop: 12 }}>
        {currentPromoImages.map((_, idx) => (
          <button
            key={idx}
            className={`promo-dot-custom ${idx === current ? 'active' : ''}`}
            onClick={() => setCurrent(idx)}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

const LayananSection = () => (
  <section className="section reveal" id="services">
    <div className="layanan-container-flex">
      <div className="layanan-photo-side">
         <img src="/images/alineabanner.png" alt="Pricelist Alinea Laundry" className="pricelist-img-flex" />
      </div>
      <div className="layanan-content-side">
        <h2 className="section-title-left">Satu Tempat, Semua Kebutuhan Cuci Anda</h2>
        <h3 className="section-subtitle-left">Alinea Laundry</h3>
        <div className="layanan-grid-circle">
          {layananList.map((item, idx) => (
            <div key={idx} className="layanan-card-circle">
              <div className="layanan-circle-icon">{item.icon}</div>
              <span className="layanan-circle-name">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const ParfumShop = () => {
  const cms = React.useContext(CMSContext);
  const currentParfums = cms?.parfumList?.length ? cms.parfumList : parfumList;
  const waNumber = '6281234567890';
  const handleBuy = (parfum) => {
    const msg = `Halo, saya ingin beli parfum ${parfum.name}.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <section id="parfum" className="section reveal premium-parfum-section">
      <div className="parfum-glow-1"></div>
      <div className="parfum-glow-2"></div>
      <div className="parfum-content-container container">
        <h2 className="section-title text-white">Parfum Laundry Premium</h2>
        <p className="section-desc text-sky-light">Rasakan aroma mewah yang sama seperti yang kami pakaikan di cucian Anda — kini tersedia untuk dibawa pulang.</p>
        <div className="parfum-grid-new">
          {currentParfums.map((p, idx) => (
            <div key={idx} className="parfum-card-new">
              <div className="parfum-img-wrapper">
                <img src={p.img} alt={p.name} className="parfum-card-img" />
              </div>
              <h3>{p.name}</h3>
              <p className="parfum-desc">{p.desc}</p>
              <div className="parfum-footer-row">
                <span className="parfum-tag">{p.tag}</span>
                <button className="btn btn-sm btn-parfum-buy" onClick={() => handleBuy(p)}>
                  <FaWhatsapp style={{ color: '#25D366', fontSize: '1rem' }} /> Beli
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQSection = () => {
  const [showAll, setShowAll] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const limit = isMobile ? 5 : 10;
  const visibleFaqs = showAll ? faqList : faqList.slice(0, limit);
  const toggleFaq = (index) => setOpenIndex(openIndex === index ? null : index);
  return (
    <section className="section reveal" id="faq">
      <h2 className="section-title">FAQ Laundry</h2>
      <p className="section-desc">Pertanyaan yang sering diajukan</p>
      <div className="faq-list">
        {visibleFaqs.map((faq, idx) => (
          <div key={idx} className="faq-item">
            <div className="faq-question" onClick={() => toggleFaq(idx)}>
              <span>{faq.q}</span>
              {openIndex === idx ? <FiMinus /> : <FiPlus />}
            </div>
            {openIndex === idx && <div className="faq-answer">{faq.a}</div>}
          </div>
        ))}
      </div>
      {faqList.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Sembunyikan' : `Lihat Lengkap (${faqList.length} pertanyaan)`}
          </button>
        </div>
      )}
    </section>
  );
};

const testimoniList = [
  { name: 'Bagas Permana', text: '“Awalnya ragu nyoba laundry online, tapi setelah pesen di Alinea Laundry bener-bener gak nyesel. Kurirnya dateng tepat waktu, bajunya wangi banget tahan sampe berminggu-minggu di lemari. Plus, lipatannya rapi banget, gak ada yang lecek satupun. Bakal jadi langganan tetap sih ini!”', stars: 5, img: 'https://ui-avatars.com/api/?name=Bagas+Permana&background=0284c7&color=fff' },
  { name: 'Sari Ayu', text: '“Sangat ngebantu buat aku yang sibuk kerja dari pagi sampai malam. Order via web gampang banget, tinggal masukin alamat dan pilih layanan. 3 hari kemudian baju udah balik bersih, licin, dan wangi. Packaging plastiknya juga tebel jadi aman pas diantar hujan-hujanan. Recommended banget!”', stars: 5, img: 'https://ui-avatars.com/api/?name=Sari+Ayu&background=ec4899&color=fff' },
  { name: 'Dian Saputra', text: '“Sering kecewa sama laundry lain karena baju putih malah jadi kusam. Tapi di sini beda, baju kerjaku yang tadinya ada noda kopi bisa ilang bersih tanpa ngerusak warna bajunya. Parfum yang dipake juga enak, gak bikin pusing kayak parfum laundry pada umumnya.”', stars: 5, img: 'https://ui-avatars.com/api/?name=Dian+Saputra&background=eab308&color=fff' },
  { name: 'Rama Aditya', text: '“Harganya terjangkau untuk kualitas yang super premium. Sempat cobain nyuci sprei dan bedcover, pas balik bener-bener kayak baru beli. Wanginya fresh dan teksturnya tetep lembut. Proses pickup dan delivery juga cepat tanpa drama kurir nyasar.”', stars: 5, img: 'https://ui-avatars.com/api/?name=Rama+Aditya&background=10b981&color=fff' },
  { name: 'Anisa Fitri', text: '“Salut sama pelayanannya yang super ramah dan responsif. Waktu itu pernah kelupaan uang di kantong celana, eh pas bajunya diantar, admin ngasih tahu kalau ada barang tertinggal dan dikembaliin utuh. Jujur dan amanah banget, mantap Alinea Laundry!”', stars: 5, img: 'https://ui-avatars.com/api/?name=Anisa+Fitri&background=8b5cf6&color=fff' },
  { name: 'Budi Santoso', text: '“Fitur tracking order di web-nya keren abis! Jadi aku tau pasti status bajuku udah sampai mana, apakah lagi diproses, dijemur, atau udah mau diantar. Jadi tenang gak perlu repot-repot nanya admin terus. Canggih, praktis, dan cucian bersih maksimal.”', stars: 5, img: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=f97316&color=fff' },
  { name: 'Citra Kirana', text: '“Pertama kali order langsung puas. Wangi ocean fresh-nya beneran kayak bau hotel bintang 5. Cucian numpuk sebulan beres semua dalam waktu 3 hari. Gak nyangka di Semarang ada layanan secanggih dan seprofesional ini. Bakalan nyaranin ke temen-temen sih.”', stars: 5, img: 'https://ui-avatars.com/api/?name=Citra+Kirana&background=14b8a6&color=fff' },
  { name: 'Dimas Anggara', text: '“Tadinya cari-cari laundry sepatu yang bagus, eh ternyata Alinea juga nyediain. Sepatu sneakers putihku yang udah dekil kena lumpur jadi kinclong lagi. Solnya bersih dan bagian dalamnya wangi banget, gak bau apek sama sekali. The best deh pokoknya.”', stars: 5, img: 'https://ui-avatars.com/api/?name=Dimas+Anggara&background=6366f1&color=fff' }
];

const TestimoniSection = () => {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 1 : 3;
  const totalSlides = isMobile ? testimoniList.length : Math.ceil(testimoniList.length / itemsPerPage);

  const nextSlide = () => setCurrent(prev => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrent(prev => (prev - 1 + totalSlides) % totalSlides);

  const getTransform = () => {
    if (isMobile) {
      return `translateX(calc(-${current * 85}% + 7.5%))`;
    }
    return `translateX(-${current * 100}%)`;
  };

  return (
    <section id="testimoni" className="section reveal">
      <h2 className="section-title">Testimoni Pelanggan</h2>
      <p className="section-desc">Apa kata mereka yang sudah membuktikan kualitas Alinea Laundry?</p>
      <div className="testimoni-slider-container" style={{ position: 'relative', marginTop: 40, padding: isMobile ? '0' : '0 40px' }}>
        
        {!isMobile && <button className="slider-arrow slider-left" onClick={prevSlide} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>‹</button>}

        <div className="testimoni-slider-viewport" style={{ overflow: 'hidden', padding: isMobile ? '10px 0' : '0' }}>
          <div
            className="testimoni-slider-track"
            style={{
              display: 'flex',
              transition: 'transform 0.5s ease-in-out',
              transform: getTransform(),
            }}
          >
            {testimoniList.map((item, idx) => {
              const isActive = isMobile ? idx === current : true;
              return (
                <div key={idx} className="testimoni-slide-item" style={{ 
                  flex: `0 0 ${isMobile ? '85%' : '33.333%'}`, 
                  padding: '0 10px',
                  opacity: isActive ? 1 : 0.4,
                  filter: isActive ? 'blur(0px)' : 'blur(2px)',
                  transition: 'all 0.5s ease-in-out',
                  transform: isActive ? 'scale(1)' : 'scale(0.95)'
                }}>
                  <div className="testimoni-card card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '30px 24px', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.03)' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
                      <img src={item.img} alt={item.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a' }}>{item.name}</strong>
                        <div className="stars" style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                          {Array.from({ length: item.stars }).map((_, i) => (
                            <FiStar key={i} style={{ color: '#fbbf24', fill: '#fbbf24', fontSize: '0.9rem' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <p className="testimoni-text" style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontStyle: 'italic', flex: 1, margin: 0 }}>
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isMobile && <button className="slider-arrow slider-right" onClick={nextSlide} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>›</button>}
      </div>

      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
           {testimoniList.map((_, idx) => (
             <button key={idx} onClick={() => setCurrent(idx)} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: idx === current ? 'var(--blue)' : '#cbd5e1', border: 'none', padding: 0 }} />
           ))}
        </div>
      )}
    </section>
  );
};



const orderSteps = [
  { icon: <FiUser />, title: '1. Login / Daftar', desc: 'Masuk ke akun Anda. Jika belum punya akun, daftar terlebih dahulu.' },
  { icon: <FiPackage />, title: '2. Pilih Layanan', desc: 'Pilih jenis layanan laundry yang Anda butuhkan (Kiloan, Satuan, Express, dll).' },
  { icon: <FiClipboard />, title: '3. Isi Detail', desc: 'Tentukan jenis pakaian, berat/jumlah, catatan khusus, dan kebutuhan lainnya.' },
  { icon: <FiMapPin />, title: '4. Pilih Alamat', desc: 'Pilih alamat penjemputan yang sudah tersimpan atau tambah alamat baru.' },
  { icon: <FiCheckCircle />, title: '5. Konfirmasi', desc: 'Periksa kembali detail pesanan Anda dan pastikan semua sudah benar.' },
  { icon: <FiCreditCard />, title: '6. Pembayaran', desc: 'Upload bukti pembayaran via QRIS setelah total ditentukan oleh admin.' },
  { icon: <FiTruck />, title: '7. Diproses', desc: 'Pesanan Anda diterima. Kurir akan menjemput, laundry diproses, dan diantar kembali.' },
  { icon: <FiStar />, title: '8. Selesai', desc: 'Pakaian bersih, wangi, dan rapi diantar ke alamat Anda tepat waktu.' },
];

const HowToOrderSection = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = React.useRef(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollPos = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.offsetWidth * 0.8; // Approximate card width on mobile
    const newIdx = Math.round(scrollPos / cardWidth);
    if (newIdx !== activeIdx) setActiveIdx(newIdx);
  };

  return (
    <section className="section reveal" id="how-to-order">
      <h2 className="section-title">Mudahnya Order di Alinea Laundry</h2>
      <p className="section-desc">Ikuti langkah berikut untuk memesan layanan laundry dengan mudah & cepat.</p>
      <div className="order-steps-wrapper">
        <div className="order-steps-grid-new" ref={scrollRef} onScroll={handleScroll}>
          <div className="order-steps-line-bg"></div>
          {orderSteps.map((step, idx) => (
            <div key={idx} className={`order-step-card-new step-${idx + 1}`}>
              <div className="order-step-badge">{idx + 1}</div>
              <div className="order-step-content">
                <div className="order-step-icon-new">{step.icon}</div>
                <h4>{step.title.split('. ')[1]}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="steps-progress-indicator">
          {orderSteps.map((_, idx) => (
            <div key={idx} className={`progress-dot-small ${activeIdx === idx ? 'active' : ''}`}></div>
          ))}
        </div>
      </div>
    </section>
  );
};



const SocialMediaSection = () => {
  const cms = React.useContext(CMSContext);
  const wa = cms?.waNumber || '6281234567890';
  const ig = cms?.igLink || 'https://instagram.com/alinealaundry';
  const tiktok = cms?.tiktokLink || 'https://tiktok.com/@alinealaundry';

  return (
  <section className="section reveal" id="social-media" style={{ padding: '80px 0', background: 'var(--bg)', textAlign: 'center' }}>
    {/* SVG Defs for Instagram Gradient */}
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </svg>

    <div className="socmed-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0284c7', padding: '6px 14px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px' }}>
      <FiMessageCircle /> Tetap Terhubung
    </div>
    <h2 className="section-title" style={{ fontSize: '2.5rem', color: '#0f172a', marginBottom: '16px' }}>Temukan Kami di Sosial Media</h2>
    <p className="section-desc" style={{ color: '#475569', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 40px auto' }}>
      Ikuti update terbaru, promo menarik, dan tips merawat pakaian dari Alinea Laundry.
    </p>

    <div className="social-media-grid-new">
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="socmed-frame wa-frame">
        <div className="socmed-bg" style={{ backgroundImage: "url('/images/socmed-wa.png')" }}></div>
        <div className="socmed-overlay">
          <FaWhatsapp className="socmed-main-icon" style={{ color: '#25D366' }} />
          <div className="socmed-text">
            <h3>WhatsApp</h3>
            <p>Tanya harga, jadwal, atau pesan!</p>
            <button className="btn-socmed-action"><FiMessageCircle /> Chat Sekarang</button>
          </div>
        </div>
      </a>
      
      <a href={ig} target="_blank" rel="noreferrer" className="socmed-frame ig-frame">
        <div className="socmed-bg" style={{ backgroundImage: "url('/images/socmed-ig.png')" }}></div>
        <div className="socmed-overlay">
          <div className="socmed-main-icon instagram-gradient-icon">
            <FaInstagram style={{ fill: 'url(#ig-grad)' }} />
          </div>
          <div className="socmed-text">
            <h3>Instagram</h3>
            <p>@alinealaundry</p>
            <button className="btn-socmed-action"><FiUserPlus /> Follow</button>
          </div>
        </div>
      </a>
      
      <a href={tiktok} target="_blank" rel="noreferrer" className="socmed-frame tiktok-frame">
        <div className="socmed-bg" style={{ backgroundImage: "url('/images/socmed-tiktok.png')" }}></div>
        <div className="socmed-overlay">
          <FaTiktok className="socmed-main-icon" style={{ color: '#fff', filter: 'drop-shadow(2px 2px 0px #ff0050) drop-shadow(-2px -2px 0px #00f2fe)' }} />
          <div className="socmed-text">
            <h3>TikTok</h3>
            <p>Video Tips &amp; Trik Seru</p>
            <button className="btn-socmed-action"><FiPlay /> Lihat Video</button>
          </div>
        </div>
      </a>
    </div>

    <div className="socmed-thankyou" style={{ marginTop: '28px', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      <FiHeart style={{ color: '#3b82f6' }} /> Terima kasih sudah mempercayakan laundry Anda kepada kami.
    </div>
  </section>
  );
};

const useScrollReveal = () => {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
    }, { threshold: 0.1 });
    reveals.forEach(r => observer.observe(r));
    return () => reveals.forEach(r => observer.unobserve(r));
  }, []);
};




/* ========== HOME PAGE ========== */
const Home = () => {
  const [cms, setCms] = useState(null);

  useEffect(() => {
    axios.get('/api/settings/home_content').then(res => {
      if(res.data) setCms(res.data);
    }).catch(err => console.log('CMS fetch err:', err));
  }, []);

  useScrollReveal();
  return (
    <CMSContext.Provider value={cms}>
      <div style={{ background: 'var(--bg)' }}>
        <ScrollProgressBar />
        <HeroWithTrack />
        <div className="home-content-bg">
          <div className="container" style={{ paddingBottom: 0 }}>
            {/* Mobile only: install banner above promo */}
            <InstallPWA variant="mobile-banner" />
            <PromoSlider />
            <LayananSection />
          </div>
          
          <ParfumShop />
          
          <div className="container" style={{ paddingTop: 0 }}>
            <HowToOrderSection />
            <FAQSection />
            <TestimoniSection />
            <SocialMediaSection />
            {/* Desktop only: install button below sosmed */}
            <InstallPWA variant="desktop-banner" />
          </div>
        </div>
        <Footer />
        <FloatingWA waNumber={cms?.waNumber} />
      </div>
    </CMSContext.Provider>
  );
};

export default Home;