/**
 * FeedbackTab — Komponen tab Feedback/Kritik & Saran di Admin Dashboard
 * Dipindahkan dari AdminDashboard.js agar file tidak terlalu besar.
 * Menerima semua data sebagai props dari AdminDashboard.
 */
import React from 'react';
import {
  FiClock, FiMessageCircle, FiStar, FiCheckCircle,
  FiZap, FiTruck, FiEye, FiTrash2
} from 'react-icons/fi';

const FeedbackTab = ({ feedbacks, loading, onRefresh, onDeleteAll, onDeleteOne }) => {
  const formatDateTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  const formatWA = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('62')) return clean;
    return clean.startsWith('0') ? '62' + clean.slice(1) : '62' + clean;
  };

  const handleContactWA = (phone, name, comment, rClean, rTidy, rSmell, rTime, rWeb) => {
    const avg = ((rClean + rTidy + rSmell + rTime + rWeb) / 5).toFixed(1);
    const msg = `Halo Kak ${name}, kami dari tim Alinea Laundry ingin mengucapkan terima kasih atas masukan evaluasi rating *${avg}⭐* yang Kakak berikan.\n\n*Rincian Penilaian Kakak:*\n- Kebersihan Cucian: ${rClean}⭐\n- Kerapian Setrika: ${rTidy}⭐\n- Keharuman Parfum: ${rSmell}⭐\n- Ketepatan Kurir: ${rTime}⭐\n- Kemudahan Website: ${rWeb}⭐\n${comment ? `\n*Ulasan Tambahan:*\n"${comment}"\n` : ''}\nMasukan Kakak sangat berharga bagi kami agar bisa terus meningkatkan pelayanan Alinea Laundry. Terima kasih banyak Kak!`;
    window.open(`https://wa.me/${formatWA(phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
        <FiClock style={{ fontSize: '2rem', animation: 'spin 2s linear infinite', marginBottom: 12 }} />
        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Memuat data masukan kritik &amp; saran...</div>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0',
        padding: '60px 24px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        marginTop: 16
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, color: '#94a3b8' }}><FiMessageCircle /></div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: 4, fontFamily: 'Outfit, sans-serif' }}>Belum Ada Feedback</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 400, margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
          Saat ini belum ada pelanggan yang mengirimkan kritik atau saran melalui dasbor mereka.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Daftar Feedback Pelanggan</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', margin: '4px 0 0' }}>Rincian tingkat kepuasan dari pelanggan terdaftar</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={onRefresh} style={{ height: '38px', borderRadius: '10px', fontWeight: 700 }}>
            Refresh Feedback
          </button>
          <button
            className="btn btn-sm"
            onClick={onDeleteAll}
            style={{ height: '38px', borderRadius: '10px', fontWeight: 700, background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <FiTrash2 size={14} /> Hapus Semua
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 20,
        marginTop: 8
      }}>
        {feedbacks.map((f) => {
          const rawRatings = [f.rating_kebersihan, f.rating_kerapian, f.rating_parfum, f.rating_waktu, f.rating_web];
          const filled = rawRatings.filter(r => r !== null && r !== undefined && r !== 0);
          const avgRating = filled.length > 0
            ? (filled.reduce((a, b) => a + Number(b), 0) / filled.length).toFixed(1)
            : '0.0';

          const detailedRatings = [
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiStar /> Kebersihan</span>, value: f.rating_kebersihan },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiCheckCircle /> Kerapian</span>, value: f.rating_kerapian },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiZap /> Keharuman</span>, value: f.rating_parfum },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiTruck /> Ketepatan Kurir</span>, value: f.rating_waktu },
            { label: <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><FiEye /> Website</span>, value: f.rating_web }
          ];

          return (
            <div
              key={f.id}
              style={{
                background: 'white',
                border: '1.5px solid #e2e8f0',
                borderRadius: 20,
                padding: 24,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
              className="feedback-card"
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <strong style={{ fontSize: '1.02rem', color: '#0f172a', display: 'block', fontWeight: 800 }}>{f.customer_name || 'Pelanggan'}</strong>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: avgRating >= 4 ? '#10b981' : avgRating >= 3 ? '#eab308' : '#ef4444',
                    background: avgRating >= 4 ? '#e6f4ea' : avgRating >= 3 ? '#fef9c3' : '#fde8e8',
                    padding: '3px 10px',
                    borderRadius: '20px'
                  }}>
                    {avgRating} <FiStar style={{ fill: 'currentColor' }} />
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 12px',
                  margin: '12px 0',
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9'
                }}>
                  {detailedRatings.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {item.value ? (
                          <>
                            {item.value} <FiStar style={{ color: '#fbbf24', fill: '#fbbf24', fontSize: '0.8rem' }} />
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {f.comment && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#475569',
                    lineHeight: 1.5,
                    background: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: 10,
                    margin: '8px 0 16px 0',
                    fontStyle: 'italic',
                    border: '1px solid #f1f5f9',
                    borderLeftColor: '#6366f1',
                    borderLeft: '3px solid #6366f1'
                  }}>
                    "{f.comment}"
                  </p>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #f1f5f9',
                paddingTop: 14,
                marginTop: 8
              }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  {formatDateTime(f.created_at)}
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onDeleteOne(f.id)}
                    style={{
                      background: '#fde8e8',
                      border: 'none',
                      color: '#ef4444',
                      padding: '8px 12px',
                      borderRadius: 10,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.2s',
                      fontFamily: 'Outfit, sans-serif'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fde8e8';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    <FiTrash2 size={13} /> Hapus
                  </button>

                  {f.customer_phone && (
                    <button
                      onClick={() => handleContactWA(
                        f.customer_phone,
                        f.customer_name,
                        f.comment,
                        f.rating_kebersihan,
                        f.rating_kerapian,
                        f.rating_parfum,
                        f.rating_waktu,
                        f.rating_web
                      )}
                      style={{
                        background: '#e6fcf0',
                        border: 'none',
                        color: '#0e9f6e',
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s',
                        fontFamily: 'Outfit, sans-serif'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#0e9f6e';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#e6fcf0';
                        e.currentTarget.style.color = '#0e9f6e';
                      }}
                    >
                      <FiMessageCircle size={14} /> Hubungi via WA
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeedbackTab;
