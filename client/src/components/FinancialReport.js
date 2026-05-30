import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FinancialReport = ({ token }) => {
  const [chartData, setChartData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [financial, setFinancial] = useState({ total_pendapatan: 0, total_order: 0 });
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      const params = startDate && endDate ? `?start=${startDate}&end=${endDate}` : '';
      const [finRes, chartRes, dailyRes, monthlyRes] = await Promise.all([
        axios.get(`/api/admin/financial${params}`, { headers: h }),
        axios.get(`/api/admin/chart`, { headers: h }),
        axios.get(`/api/admin/daily-report${params}`, { headers: h }),
        axios.get(`/api/admin/monthly-report`, { headers: h }),
      ]);
      setFinancial(finRes.data);
      setChartData(chartRes.data);
      setDailyData(dailyRes.data);
      setMonthlyData(monthlyRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatRupiah = (num) => 'Rp ' + (parseInt(num) || 0).toLocaleString('id-ID');

  return (
    <div>
      <div className="filter-row" style={{ marginBottom: 20 }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button className="btn btn-sm" onClick={fetchData}>Filter</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value">{formatRupiah(financial.total_pendapatan)}</div>
          <div className="stat-label">Total Pendapatan</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{financial.total_order}</div>
          <div className="stat-label">Order Lunas</div>
        </div>
      </div>

      {/* ====== COMPARATIVE BRANCH PERFORMANCE ====== */}
      {financial.branch_performance && financial.branch_performance.length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--navy, #0b1d3a)', fontWeight: 800 }}>
            {/* Inline beautiful Grid SVG Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue, #3b82f6)' }}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Performa Keuangan Antar Cabang
          </h3>
          
          {/* Comparative Cards Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16,
            marginBottom: 20 
          }}>
            {financial.branch_performance.map(b => {
              // Custom gradient color based on branch ID
              let grad = 'linear-gradient(135deg, #3b82f6, #1d4ed8)'; // Sampangan (ID: 1)
              let borderCol = '#bfdbfe';
              let textCol = '#1e40af';
              
              if (b.branch_id === 2) { // Unnes (ID: 2)
                grad = 'linear-gradient(135deg, #10b981, #047857)';
                borderCol = '#bbf7d0';
                textCol = '#166534';
              } else if (b.branch_id === 3) { // Tlogosari (ID: 3)
                grad = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
                borderCol = '#ddd6fe';
                textCol = '#5b21b6';
              }
              
              return (
                <div key={b.branch_id} style={{
                  background: 'white',
                  borderRadius: 16,
                  border: `1px solid ${borderCol}`,
                  padding: 20,
                  boxShadow: '0 4px 12px rgba(11,29,58,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Decorative corner indicator */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 6,
                    height: '100%',
                    background: grad
                  }} />
                  
                  <div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px',
                      color: '#64748b' 
                    }}>Cabang</span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy, #0b1d3a)' }}>
                      {b.branch_name}
                    </h4>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-3, #6b7280)' }}>Total Order:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy, #0b1d3a)' }}>
                        {b.total_order} Lunas
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-3, #6b7280)' }}>Pendapatan:</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: textCol }}>
                        {formatRupiah(b.total_pendapatan)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Distribution Graph (HTML/CSS Based Bar Graph) */}
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            border: '1px solid var(--border, #e5e7eb)',
            padding: 20,
            boxShadow: '0 4px 20px rgba(11,29,58,0.02)'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--navy, #0b1d3a)' }}>
              Perbandingan Pendapatan Cabang
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                const maxRev = Math.max(...financial.branch_performance.map(b => b.total_pendapatan), 1);
                
                return financial.branch_performance.map(b => {
                  const percent = Math.max((b.total_pendapatan / maxRev) * 100, 3); // Min width 3% for visibility
                  
                  let barGrad = 'linear-gradient(90deg, #60a5fa, #3b82f6)'; // Sampangan
                  let textCol = '#2563eb';
                  if (b.branch_id === 2) { // Unnes
                    barGrad = 'linear-gradient(90deg, #34d399, #10b981)';
                    textCol = '#10b981';
                  } else if (b.branch_id === 3) { // Tlogosari
                    barGrad = 'linear-gradient(90deg, #a78bfa, #8b5cf6)';
                    textCol = '#8b5cf6';
                  }
                  
                  return (
                    <div key={b.branch_id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy, #0b1d3a)' }}>{b.branch_name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-3, #6b7280)' }}>({b.total_order} Order)</span>
                          <span style={{ fontWeight: 800, color: textCol }}>{formatRupiah(b.total_pendapatan)}</span>
                        </div>
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: 12, 
                        background: '#f1f5f9', 
                        borderRadius: 6, 
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: barGrad,
                          borderRadius: 6,
                          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      <h3>Grafik Pendapatan (30 hari)</h3>
      {chartData.length > 0 ? (
        <div className="chart-container" style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 30 }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
              <YAxis tickFormatter={(val) => 'Rp ' + (val / 1000).toLocaleString('id-ID') + 'k'} />
              <Tooltip formatter={(value) => formatRupiah(value)} labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <Line type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <p>Data grafik tidak tersedia.</p>}

      {/* Tabel Harian */}
      <h3>Laporan Harian</h3>
      <div className="table-container">
        <table className="financial-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.length > 0 ? dailyData.map((d, idx) => (
              <tr key={idx}>
                <td>{new Date(d.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td>{formatRupiah(d.total)}</td>
              </tr>
            )) : <tr><td colSpan={2} style={{ textAlign: 'center' }}>Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Tabel Bulanan */}
      <h3 style={{ marginTop: 30 }}>Laporan Bulanan</h3>
      <div className="table-container">
        <table className="financial-table">
          <thead>
            <tr>
              <th>Bulan</th>
              <th>Total Order</th>
              <th>Total Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.length > 0 ? monthlyData.map((d, idx) => (
              <tr key={idx}>
                <td>{new Date(d.month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                <td>{d.order_count}</td>
                <td>{formatRupiah(d.total)}</td>
              </tr>
            )) : <tr><td colSpan={3} style={{ textAlign: 'center' }}>Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialReport;