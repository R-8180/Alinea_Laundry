import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import FloatingWA from '../components/FloatingWA';
import {
  FiPackage, FiDroplet, FiBox, FiBriefcase, FiHeart,
  FiShield, FiSettings, FiTool,
  FiWatch, FiStar, FiClock, FiTruck, FiMapPin, FiSearch, FiPlus, FiMinus, FiUser, FiClipboard, FiCheckCircle, FiCreditCard
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
  { src: '/images/alineapromo1.png', alt: 'Promo 1' },
  { src: '/images/alineapromo2.png', alt: 'Promo 2' },
  { src: '/images/alineapromo3.png', alt: 'Promo 3' },
];

const parfumList = [
  { name: 'Lavender', img: '/images/parfum-lavender.png', desc: 'Aroma calming dan relaxing cocok untuk pakaian harian.', tag: 'Rp 300.000' },
  { name: 'Sakura', img: '/images/parfum-sakura.png', desc: 'Floral premium ala Jepang wangi lembut & feminin.', tag: 'Rp 300.000' },
  { name: 'Ocean Fresh', img: '/images/parfum-ocean.png', desc: 'Fresh clean seperti linen hotel dan terasa lebih mewah.', tag: 'Rp 300.000' },
  { name: 'Vanilla', img: '/images/parfum-vanilla.png', desc: 'Sweet creamy yang hangat dan elegan sepanjang hari.', tag: 'Rp 300.000' },
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
  { q: 'Covered Area Getwash Laundry', a: 'Kami melayani seluruh Semarang dan sekitarnya.' },
  { q: 'Apakah ada layanan antar jemput di hari Minggu?', a: 'Ya, kami tetap beroperasi di hari Minggu pukul 09.00-15.00.' },
  { q: 'Bagaimana jika cucian rusak?', a: 'Kami memiliki asuransi kerusakan. Hubungi admin segera.' },
  { q: 'Apakah bisa request parfum khusus?', a: 'Tentu, silakan tulis di catatan atau hubungi CS kami.' },
  { q: 'Berapa minimal order?', a: 'Tidak ada minimal order, Anda bisa laundry 1 item saja.' },
];

/* ========== KOMPONEN ========== */
const ScrollProgressBar = () => {
  const [scrollW, setScrollW] = useState('0%');

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${(totalScroll / windowHeight) * 100}%`;
      setScrollW(scroll);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="scroll-progress-container">
      <div className="scroll-progress-fill" style={{ width: scrollW }}></div>
    </div>
  );
};



const HeroWithTrack = () => {
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
    cuci: <><FiSettings /> Sedang dicuci</>,
    antar: <><FiPackage /> Sedang diantar</>,
    selesai: <><FiCheckCircle /> Selesai</>,
  };

  return (
    <section className="hero-new">
      <div className="hero-bg-anim"></div>
      <div className="hero-shape-1"></div>
      <div className="hero-shape-2"></div>
      
      <div className="hero-content-wrapper">
        <span className="hero-badge"><FiStar style={{color: 'gold'}} /> Laundry Premium Semarang 24 Jam</span>
        <h1 className="hero-title-new">Laundry Bersih, Wangi, & Praktis</h1>
        <p className="hero-subtitle-new">Tanpa Keluar Rumah!</p>
        <p className="hero-description-new">
          Alinea Laundry siap melayani Anda 24 jam dengan layanan gratis antar jemput di area Kota Semarang dengan hanya klik via web kami.
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
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const total = promoImages.length;

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
          {promoImages.map((img, idx) => (
            <div
              key={idx}
              className="promo-slider-mobile-item"
              style={{ backgroundImage: `url(${img.src})` }}
            />
          ))}
        </div>
      </div>
      {/* Pindahkan dots ke luar viewport */}
      <div className="promo-dots-custom" style={{ marginTop: 12 }}>
        {promoImages.map((_, idx) => (
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
}

  // Mode Desktop: Coverflow
  const prevIdx = (current - 1 + total) % total;
  const nextIdx = (current + 1) % total;

  return (
    <section className="section reveal promo-top">
      <h2 className="section-title">Promo Spesial</h2>
      <div className="promo-coverflow">
        <div className="promo-coverflow-stage">
          {promoImages.map((img, idx) => {
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
      <div className="promo-dots-custom">
        {promoImages.map((_, idx) => (
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
        <h2 className="section-title-left">Laundry Terdekat & Terlengkap</h2>
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
  const waNumber = '6281234567890';
  const handleBuy = (parfum) => {
    const msg = `Halo, saya ingin beli parfum ${parfum.name}.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <section id="parfum" className="section reveal premium-parfum-section">
      <div className="parfum-glow-1"></div>
      <div className="parfum-glow-2"></div>
      <div className="parfum-content-container">
        <h2 className="section-title text-white">Parfum Favorit Pilihan</h2>
        <p className="section-desc text-sky-light">Pilih aroma premium yang tahan lama hingga 7 hari dan membuat pakaian lebih segar setelah dicuci.</p>
        <div className="parfum-grid-new">
          {parfumList.map((p, idx) => (
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

// Ganti data testimoni dengan 10 dummy
const testimoniList = [
  { name: 'Bagas', text: '“Wangi dan rapi banget! Langganan terus nih.”', stars: 5 },
  { name: 'Sari', text: '“Antar jemputnya cepat, gak ribet. Recommended!”', stars: 5 },
  { name: 'Dian', text: '“Harum tahan lama, pelayanan ramah.”', stars: 5 },
  { name: 'Rama', text: '“Cucian bersih maksimal.”', stars: 5 },
  { name: 'Anisa', text: '“Pelayanan sangat ramah, hasil cucian memuaskan.”', stars: 4 },
  { name: 'Budi', text: '“Bersih, wangi, dan rapi. Pasti langganan.”', stars: 5 },
  { name: 'Citra', text: '“Pertama kali nyoba langsung jatuh hati. Terbaik!”', stars: 5 },
  { name: 'Dimas', text: '“Harga terjangkau, kualitas oke banget.”', stars: 4 },
  { name: 'Eka', text: '“Nggak perlu keluar rumah, cucian sudah beres.”', stars: 5 },
  { name: 'Faisal', text: '“Sangat membantu untuk yang sibuk. Recommended!”', stars: 5 },
];

const TestimoniSection = () => {
  const [current, setCurrent] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3); // default desktop

  // Tentukan jumlah item per halaman berdasarkan lebar layar
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth > 768 ? 3 : 1);
    };
    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const totalPages = Math.ceil(testimoniList.length / itemsPerPage);

  const nextSlide = () => setCurrent(prev => (prev + 1) % totalPages);
  const prevSlide = () => setCurrent(prev => (prev - 1 + totalPages) % totalPages);

  return (
    <section id="testimoni" className="section reveal">
      <h2 className="section-title">Testimoni Pelanggan</h2>
      <div className="testimoni-slider-container">
        {/* Tombol panah kiri */}
        <button className="slider-arrow slider-left" onClick={prevSlide}>‹</button>

        {/* Area slider */}
        <div className="testimoni-slider-viewport">
          <div
            className="testimoni-slider-track"
            style={{
              transform: `translateX(-${current * (100 / itemsPerPage)}%)`,
              gridTemplateColumns: `repeat(${testimoniList.length}, ${100 / itemsPerPage}%)`,
            }}
          >
            {testimoniList.map((item, idx) => (
              <div key={idx} className="testimoni-slide-item">
                <div className="testimoni-card card">
                  <div className="stars">
                    {Array.from({ length: item.stars }).map((_, i) => (
                      <FiStar key={i} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    ))}
                  </div>
                  <p className="testimoni-text">{item.text}</p>
                  <strong className="testimoni-author">— {item.name}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tombol panah kanan */}
        <button className="slider-arrow slider-right" onClick={nextSlide}>›</button>
      </div>

      {/* Indikator dots (opsional) */}
      <div className="slider-dots" style={{ marginTop: 15 }}>
        {Array.from({ length: totalPages }).map((_, idx) => (
          <span
            key={idx}
            className={`dot ${idx === current ? 'active' : ''}`}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
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
            <div key={idx} className="order-step-card-new">
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



const SocialMediaSection = () => (
  <section className="section reveal" id="social-media">
    <h2 className="section-title">Temukan Kami di Sosial Media</h2>
    <p className="section-desc">Ikuti update terbaru, promo menarik, dan tips merawat pakaian dari Alinea Laundry.</p>
    <div className="social-media-grid-new">
      <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="socmed-frame wa-frame">
        <div className="socmed-bg" style={{ backgroundImage: "url('/images/socmed-wa.png')" }}></div>
        <div className="socmed-overlay">
          <FaWhatsapp className="socmed-main-icon" />
          <div className="socmed-text">
            <h3>WhatsApp</h3>
            <p>Hubungi Admin (Fast Respon)</p>
          </div>
        </div>
      </a>
      <a href="https://instagram.com/alinealaundry" target="_blank" rel="noreferrer" className="socmed-frame ig-frame">
        <div className="socmed-bg" style={{ backgroundImage: "url('/images/socmed-ig.png')" }}></div>
        <div className="socmed-overlay">
          <FaInstagram className="socmed-main-icon" />
          <div className="socmed-text">
            <h3>Instagram</h3>
            <p>@alinealaundry</p>
          </div>
        </div>
      </a>
      <a href="https://tiktok.com/@alinealaundry" target="_blank" rel="noreferrer" className="socmed-frame tiktok-frame">
        <div className="socmed-bg" style={{ backgroundImage: "url('/images/socmed-tiktok.png')" }}></div>
        <div className="socmed-overlay">
          <FaTiktok className="socmed-main-icon" />
          <div className="socmed-text">
            <h3>TikTok</h3>
            <p>Video Tips & Trik Seru</p>
          </div>
        </div>
      </a>
    </div>
  </section>
);

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
  useScrollReveal();
  return (
    <div style={{ background: 'var(--bg)' }}>
      <ScrollProgressBar />
      <HeroWithTrack />
      <div className="home-content-bg">
        <div className="container">
          <PromoSlider />
          <LayananSection />
        </div>
        <ParfumShop />
        <div className="container">
          <FAQSection />
          <HowToOrderSection />
          <TestimoniSection />
          <SocialMediaSection />
        </div>
      </div>
      <Footer />
      <FloatingWA />
    </div>
  );
};

export default Home;