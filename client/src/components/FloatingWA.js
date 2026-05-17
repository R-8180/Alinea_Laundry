import React from 'react';

const FloatingWA = () => {
  const waNumber = '6281227884654'; // ganti dengan nomor aslimu
  const message = 'Halo, saya mau tanya soal laundry.';
  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-wa"
    >
      <img
        src="/images/wa-logo.png"
        alt="Chat WhatsApp"
        className="wa-logo-img"
      />
    </a>
  );
};

export default FloatingWA;