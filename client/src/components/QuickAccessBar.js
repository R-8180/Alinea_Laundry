import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSun, FiSettings, FiTruck, FiArrowRight, FiStar, FiGrid } from 'react-icons/fi';

const QuickAccessBar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || location.pathname !== '/') return null;

  const isAdmin = user.role === 'admin';
  const isCourier = user.role === 'courier';

  const branchLabels = { 1: 'Sampangan', 2: 'Unnes', 3: 'Tlogosari' };
  const branchName = user.branch_id ? branchLabels[user.branch_id] : null;

  const greeting = isAdmin
    ? `Halo, ${user.name}!`
    : isCourier
    ? `Halo Kurir, ${user.name}!`
    : `Halo, ${user.name}!`;

  const subText = isAdmin
    ? (branchName ? `Kelola pesanan di cabang ${branchName}.` : 'Pantau dan kelola semua pesanan dari sini.')
    : isCourier
    ? 'Cek jadwal pengantaran hari ini.'
    : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Ayoo pantau orderan kamu yaa!!! <FiStar /></span>;

  const buttonText = isAdmin
    ? 'Dashboard Admin'
    : isCourier
    ? 'Dashboard Kurir'
    : 'Dashboard Pesanan';

  const buttonIcon = isAdmin
    ? <FiSettings />
    : isCourier
    ? <FiTruck />
    : <FiGrid />;

  return (
    <div className="welcome-banner-bar">
      <div className="welcome-banner-content">
        <div className="welcome-banner-left">
          <FiSun className="welcome-icon" />
          <div className="welcome-text-group">
            <h3>{greeting}</h3>
            <p>{subText}</p>
          </div>
        </div>
        <button className="btn welcome-btn" onClick={() => navigate('/dashboard')}>
          {buttonIcon} {buttonText} <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

export default QuickAccessBar;