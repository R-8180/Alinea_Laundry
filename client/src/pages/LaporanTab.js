import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  FiCalendar, FiDollarSign, FiTrendingUp, FiBarChart2,
  FiDownload, FiPrinter, FiFilter, FiRefreshCw
} from 'react-icons/fi';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const fmtDate = (str) => {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const LaporanTab = () => {
  const token = localStorage.getItem('token');
  const h = { Authorization: `Bearer ${token}` };

  const [filterMode, setFilterMode] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1).padStart(2,'0'));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [financial, setFinancial] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [toast, setToast] = useState(null);
  const canvasRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let params = '';
      if (filterMode === 'range' && startDate && endDate) {
        params = `?start=${startDate}&end=${endDate}`;
      } else if (filterMode === 'month') {
        params = `?year=${filterYear}&month=${filterMonth}`;
      } else if (filterMode === 'year') {
        params = `?year=${filterYear}`;
      }

      const [finRes, chartRes] = await Promise.all([
        axios.get(`/api/admin/financial${params}`, { headers: h }),
        axios.get(`/api/admin/chart${params}`, { headers: h }),
      ]);
      setFinancial(finRes.data);
      setChartData(chartRes.data || []);
    } catch {
      showToast('Gagal memuat data laporan', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterMode, startDate, endDate, filterMonth, filterYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Grafik Canvas ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth || 700;
    const H = 260;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 20, right: 20, bottom: 40, left: 70 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;
    const maxVal = Math.max(...chartData.map(d => d.total), 1);

    // Grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + cH - (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fmtRp((i / 4) * maxVal).replace('Rp ',''), pad.left - 6, y + 4);
    }

    // Line & area
    const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    gradient.addColorStop(0, 'rgba(59,130,246,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    const stepX = cW / (chartData.length - 1 || 1);

    ctx.beginPath();
    chartData.forEach((d, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + cH - (d.total / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (chartData.length - 1) * stepX, H - pad.bottom);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    chartData.forEach((d, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + cH - (d.total / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    chartData.forEach((d, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + cH - (d.total / maxVal) * cH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3B82F6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const skip = Math.ceil(chartData.length / 8);
    chartData.forEach((d, i) => {
      if (i % skip === 0 || i === chartData.length - 1) {
        const x = pad.left + i * stepX;
        const label = new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        ctx.fillText(label, x, H - 8);
      }
    });

  }, [chartData]);

  // CSV export
  const exportCSV = () => {
    const rows = [['Tanggal', 'Pendapatan (Rp)'], ...chartData.map(d => [fmtDate(d.date), d.total]), [], ['TOTAL', financial?.total_pendapatan || 0], ['Order Lunas', financial?.total_order || 0]];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_alinea_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV berhasil diexport');
  };

  // Print PDF
  const exportPDF = () => {
    window.print();
    showToast('Membuka dialog cetak...');
  };

  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div style={{ padding: '0 0 2rem' }} id="laporan-print-area">
      {/* Filter Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiFilter /> Filter Laporan
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${filterMode === 'range' ? '' : 'btn-secondary'}`} onClick={() => setFilterMode('range')}>Rentang Tanggal</button>
            <button className={`btn btn-sm ${filterMode === 'month' ? '' : 'btn-secondary'}`} onClick={() => setFilterMode('month')}>Per Bulan</button>
            <button className={`btn btn-sm ${filterMode === 'year' ? '' : 'btn-secondary'}`} onClick={() => setFilterMode('year')}>Per Tahun</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {filterMode === 'range' && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dari</label>
                <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sampai</label>
                <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          {filterMode === 'month' && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Bulan</label>
                <select className="form-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                  {MONTHS_ID.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tahun</label>
                <select className="form-input" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}
          {filterMode === 'year' && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tahun</label>
              <select className="form-input" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <button className="btn btn-sm" onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiRefreshCw /> {loading ? 'Memuat...' : 'Terapkan'}
          </button>

          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="btn btn-sm btn-secondary" onClick={exportCSV}><FiDownload /> CSV</button>
            <button className="btn btn-sm btn-secondary" onClick={exportPDF}><FiPrinter /> Cetak</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><FiDollarSign /></div>
          <div className="stat-value">{fmtRp(financial?.total_pendapatan)}</div>
          <div className="stat-label">Total Pendapatan</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><FiBarChart2 /></div>
          <div className="stat-value">{financial?.total_order || 0}</div>
          <div className="stat-label">Order Lunas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><FiTrendingUp /></div>
          <div className="stat-value">{fmtRp(financial?.total_order > 0 ? Math.round(financial.total_pendapatan / financial.total_order) : 0)}</div>
          <div className="stat-label">Rata-rata per Order</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><FiCalendar /></div>
          <div className="stat-value">{chartData.length}</div>
          <div className="stat-label">Hari Transaksi</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Grafik Pendapatan</h3>
        <div style={{ position: 'relative' }}>
          {loading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>Memuat...</div>}
          <canvas ref={canvasRef} style={{ width: '100%', height: 260 }} />
        </div>
      </div>

      {/* Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Laporan Harian</h3>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="invoice-table">
              <thead><tr><th>Tanggal</th><th style={{ textAlign: 'right' }}>Pendapatan</th></tr></thead>
              <tbody>
                {chartData.length > 0 ? [...chartData].reverse().map((d, i) => (
                  <tr key={i}><td>{fmtDate(d.date)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtRp(d.total)}</td></tr>
                )) : <tr><td colSpan={2} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Tidak ada data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Laporan Bulanan</h3>
          {/* Hitung manual dari chartData */}
          {(() => {
            const monthly = {};
            chartData.forEach(d => {
              const dt = new Date(d.date);
              const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
              if (!monthly[key]) monthly[key] = { total: 0, count: 0 };
              monthly[key].total += Number(d.total || 0);
              monthly[key].count += 1;
            });
            const rows = Object.keys(monthly).sort().map(key => {
              const [y, m] = key.split('-');
              return { key, label: `${MONTHS_ID[parseInt(m)-1]} ${y}`, ...monthly[key] };
            });
            const totalRevenue = rows.reduce((acc, r) => acc + r.total, 0);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Pendapatan
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: 12 }}>
                  {filterMode === 'month' ? `${MONTHS_ID[parseInt(filterMonth)-1]} ${filterYear}` : 
                   filterMode === 'year' ? `Tahun ${filterYear}` : 
                   `${startDate && endDate ? `${fmtDate(startDate)} - ${fmtDate(endDate)}` : 'Semua Periode'}`}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3B82F6' }}>
                  {fmtRp(totalRevenue)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: 8 }}>
                  Dari {rows.length} Bulan Transaksi
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4', color: toast.type === 'error' ? '#B91C1C' : '#15803D', border: `1.5px solid ${toast.type === 'error' ? '#FECACA' : '#86EFAC'}`, borderRadius: 12, padding: '0.875rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', zIndex: 2000 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default LaporanTab;