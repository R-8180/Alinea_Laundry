import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiStar, FiMessageSquare } from 'react-icons/fi';
import { showSuccess, showError, showLoading, closeLoading } from '../utils/swal';

const FeedbackModal = ({ isOpen, onClose, user }) => {
  const [ratingKebersihan, setRatingKebersihan] = useState(0);
  const [hoverKebersihan, setHoverKebersihan] = useState(0);

  const [ratingKerapian, setRatingKerapian] = useState(0);
  const [hoverKerapian, setHoverKerapian] = useState(0);

  const [ratingParfum, setRatingParfum] = useState(0);
  const [hoverParfum, setHoverParfum] = useState(0);

  const [ratingWaktu, setRatingWaktu] = useState(0);
  const [hoverWaktu, setHoverWaktu] = useState(0);

  const [ratingWeb, setRatingWeb] = useState(0);
  const [hoverWeb, setHoverWeb] = useState(0);

  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setRatingKebersihan(0);
      setRatingKerapian(0);
      setRatingParfum(0);
      setRatingWaktu(0);
      setRatingWeb(0);
      setComment('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const questions = [
    {
      id: 'kebersihan',
      label: '1. Kebersihan Cucian',
      desc: 'Seberapa bersih pakaian Anda setelah kami cuci?',
      value: ratingKebersihan,
      setValue: setRatingKebersihan,
      hoverValue: hoverKebersihan,
      setHoverValue: setHoverKebersihan
    },
    {
      id: 'kerapian',
      label: '2. Kerapian Setrika',
      desc: 'Seberapa rapi lipatan dan hasil setrika pakaian Anda?',
      value: ratingKerapian,
      setValue: setRatingKerapian,
      hoverValue: hoverKerapian,
      setHoverValue: setHoverKerapian
    },
    {
      id: 'parfum',
      label: '3. Keharuman Parfum',
      desc: 'Seberapa wangi dan tahan lama parfum pilihan Anda?',
      value: ratingParfum,
      setValue: setRatingParfum,
      hoverValue: hoverParfum,
      setHoverValue: setHoverParfum
    },
    {
      id: 'waktu',
      label: '4. Ketepatan Kurir',
      desc: 'Seberapa cepat kurir kami melakukan pickup & delivery?',
      value: ratingWaktu,
      setValue: setRatingWaktu,
      hoverValue: hoverWaktu,
      setHoverValue: setHoverWaktu
    },
    {
      id: 'web',
      label: '5. Kemudahan Website',
      desc: 'Seberapa mudah Anda menggunakan sistem website kami?',
      value: ratingWeb,
      setValue: setRatingWeb,
      hoverValue: hoverWeb,
      setHoverValue: setHoverWeb
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Pastikan minimal ada 1 rating terisi
    const filledRatingsCount = questions.filter(q => q.value > 0).length;
    if (filledRatingsCount === 0) {
      showError('Feedback Kosong', 'Mohon berikan minimal 1 penilaian bintang pada salah satu kategori pelayanan kami.');
      return;
    }

    setIsSubmitting(true);
    showLoading('Mengirim Feedback', 'Feedback Anda sedang dikirim ke admin...');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/feedback',
        {
          rating_kebersihan: ratingKebersihan,
          rating_kerapian: ratingKerapian,
          rating_parfum: ratingParfum,
          rating_waktu: ratingWaktu,
          rating_web: ratingWeb,
          comment
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeLoading();
      onClose(); // Tutup modal secara instan
      showSuccess('Terima Kasih!', 'Feedback Anda sangat berharga untuk membantu membangun Alinea Laundry menjadi lebih baik lagi.');
    } catch (err) {
      closeLoading();
      showError('Gagal Mengirim', err.response?.data?.error || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: scale(0.95) translateY(15px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .feedback-modal-card {
          background: #ffffff;
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 24px;
          padding: 26px 24px;
          max-width: 520px;
          width: 92%;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
          position: 'relative';
          max-height: 90vh;
          overflow-y: auto;
        }
        .star-button-compact {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.15s;
          outline: none;
        }
        .star-button-compact:hover {
          transform: scale(1.18);
        }
        .star-icon-compact {
          font-size: 1.55rem;
          transition: fill 0.15s, color 0.15s;
        }
        .feedback-textarea-compact {
          width: 100%;
          border: 1.5px solid rgba(99, 102, 241, 0.15);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.88rem;
          font-family: 'Outfit', sans-serif;
          resize: none;
          min-height: 80px;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s;
          color: #0f172a;
          box-sizing: border-box;
        }
        .feedback-textarea-compact:focus {
          border-color: #4f46e5;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .feedback-label-compact {
          display: block;
          margin-bottom: 4px;
          font-weight: 700;
          color: #1e293b;
          font-size: 0.82rem;
          text-align: left;
        }
        .feedback-input-disabled-compact {
          width: 100%;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
          color: #64748b;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-family: 'Outfit', sans-serif;
          outline: none;
          box-sizing: border-box;
        }
        .question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #f1f5f9;
          gap: 12px;
        }
        .question-text-side {
          flex: 1;
          text-align: left;
        }
        .question-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          font-family: 'Outfit', sans-serif;
        }
        .question-desc {
          font-size: 0.76rem;
          color: #64748b;
          margin: 1px 0 0 0;
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
      
      <div className="feedback-modal-card">
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
        >
          <FiX size={18} />
        </button>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h3 style={{
            margin: '0 0 4px',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: 'Outfit, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            Evaluasi Layanan Alinea <FiMessageSquare style={{ color: '#64748b' }} />
          </h3>
          <p style={{
            margin: 0,
            fontSize: '0.8rem',
            color: '#64748b',
            fontFamily: 'Outfit, sans-serif',
            lineHeight: 1.4
          }}>
            Berikan nilai pada 5 pertanyaan berikut agar kami bisa terus meningkatkan kualitas cucian Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Read-Only User Info (Email removed!) */}
          <div style={{ width: '100%' }}>
            <label className="feedback-label-compact">Nama Pelanggan</label>
            <input 
              type="text" 
              value={user?.name || ''} 
              disabled 
              className="feedback-input-disabled-compact"
            />
          </div>

          {/* 5 Evaluative Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', margin: '4px 0' }}>
            {questions.map((q) => (
              <div key={q.id} className="question-row">
                <div className="question-text-side">
                  <h4 className="question-title">{q.label}</h4>
                  <p className="question-desc">{q.desc}</p>
                </div>
                {/* 5-star selector */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((index) => {
                    const isStarred = index <= (q.hoverValue || q.value);
                    return (
                      <button
                        key={index}
                        type="button"
                        className="star-button-compact"
                        onClick={() => q.setValue(index)}
                        onMouseEnter={() => q.setHoverValue(index)}
                        onMouseLeave={() => q.setHoverValue(0)}
                      >
                        <FiStar
                          className="star-icon-compact"
                          style={{
                            color: isStarred ? '#fbbf24' : '#cbd5e1',
                            fill: isStarred ? '#fbbf24' : 'none'
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Optional comment text */}
          <div>
            <label className="feedback-label-compact">Kritik &amp; Saran Tambahan (Opsional)</label>
            <textarea
              className="feedback-textarea-compact"
              placeholder="Tulis ulasan tambahan, saran khusus, atau keluhan lainnya di sini..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                background: 'white',
                color: '#64748b',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Outfit, sans-serif'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: 'white',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 6px 20px -4px rgba(79, 70, 229, 0.4)',
                fontFamily: 'Outfit, sans-serif'
              }}
            >
              Kirim Masukan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
