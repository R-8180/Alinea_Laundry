import React from 'react';
import { FiClock, FiMapPin, FiTruck } from 'react-icons/fi';

const TopMarquee = () => {
  const MarqueeItem = () => (
    <span className="marquee-item">
      <FiClock className="marquee-icon" /> Buka 24 Jam <span className="marquee-dot">•</span>
      <FiMapPin className="marquee-icon" /> Gratis Ongkir Semarang Kota <span className="marquee-dot">•</span>
      <FiTruck className="marquee-icon" /> Layanan Antar Jemput Cepat <span className="marquee-dot">•</span>
    </span>
  );

  return (
    <div className="marquee-container">
      <div className="marquee-content">
        <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
      </div>
    </div>
  );
};

export default TopMarquee;
