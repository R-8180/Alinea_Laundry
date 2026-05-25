import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as Icons from 'react-icons/fi';

const TopMarquee = () => {
  const [items, setItems] = useState([
    { icon: 'FiClock', text: 'Buka 24 Jam' },
    { icon: 'FiMapPin', text: 'Gratis Ongkir Semarang Kota' },
    { icon: 'FiTruck', text: 'Layanan Antar Jemput Cepat' },
    { icon: 'none', text: '#LaundryMudahLewatWebAlineaLaundry' }
  ]);

  useEffect(() => {
    axios.get('/api/settings/home_content')
      .then(res => {
        if (res.data && res.data.marqueeText && res.data.marqueeText.length > 0) {
          setItems(res.data.marqueeText);
        }
      })
      .catch(() => {});
  }, []);

  const MarqueeItem = () => (
    <span className="marquee-item">
      {items.map((item, idx) => {
        const IconComponent = item.icon && item.icon !== 'none' ? Icons[item.icon] : null;
        return (
          <React.Fragment key={idx}>
            {IconComponent && <IconComponent className="marquee-icon" />}
            {item.icon === 'none' ? (
              <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px' }}> {item.text} </span>
            ) : (
              <span> {item.text} </span>
            )}
            <span className="marquee-dot">•</span>
          </React.Fragment>
        );
      })}
    </span>
  );

  return (
    <div className="marquee-container">
      <div className="marquee-content">
        <MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem /><MarqueeItem />
      </div>
    </div>
  );
};

export default TopMarquee;
