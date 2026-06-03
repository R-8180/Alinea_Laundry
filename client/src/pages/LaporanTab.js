import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiBarChart2,
  FiDownload, FiPrinter, FiFilter, FiPlus, FiTrash2, FiPieChart, FiActivity, FiBriefcase
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const fmtDate = (str) => {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

const LaporanTab = ({ activeBranchId }) => {
  const token = localStorage.getItem('token');

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'transactions'
  
  // Filters
  const [filterMode, setFilterMode] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1).padStart(2,'0'));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  
  // Data
  const [loading, setLoading] = useState(false);
  const [financial, setFinancial] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topBranches, setTopBranches] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Transaction form
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ type: 'pengeluaran', category: '', amount: '', description: '', date: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      let params = [];
      if (filterMode === 'range' && startDate && endDate) {
        params.push(`start=${startDate}`);
        params.push(`end=${endDate}`);
      } else if (filterMode === 'month') {
        params.push(`year=${filterYear}`);
        params.push(`month=${filterMonth}`);
      } else if (filterMode === 'year') {
        params.push(`year=${filterYear}`);
      }
      if (activeBranchId) {
        params.push(`branch_id=${activeBranchId}`);
      }
      const paramStr = params.length > 0 ? `?${params.join('&')}` : '';

      const h = { Authorization: `Bearer ${token}` };

      const [finRes, chartRes, srvRes, brnRes] = await Promise.all([
        axios.get(`/api/admin/financial${paramStr}`, { headers: h }),
        axios.get(`/api/admin/chart${paramStr}`, { headers: h }),
        axios.get(`/api/admin/top-services${paramStr}`, { headers: h }),
        axios.get(`/api/admin/top-branches`, { headers: h }) // global only
      ]);
      setFinancial(finRes.data);
      
      // format chart data for recharts
      const formattedChart = chartRes.data.map(d => ({
        ...d,
        displayDate: filterMode === 'year' 
          ? MONTHS_ID[new Date(d.date).getMonth()] 
          : new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      }));
      setChartData(formattedChart);
      const formattedServices = srvRes.data.map(s => {
        let fullName = '';
        const cat = s.category;
        const type = s.service_type;
        const sName = s.service_name;
        const iName = s.item_name;

        if (cat === 'cuci_setrika') {
          fullName = `Cuci Setrika · ${sName || 'Reguler'}`;
        } else if (cat === 'cuci_lipat') {
          fullName = `Cuci Lipat · ${sName || 'Reguler'}`;
        } else if (cat === 'satuan') {
          fullName = `Satuan · ${sName || iName || 'Lainnya'}`;
        } else {
          if (type === 'kiloan') {
            fullName = `Kiloan · ${sName || iName || 'Reguler'}`;
          } else {
            fullName = `Satuan · ${iName || sName || 'Lainnya'}`;
          }
        }
        return {
          name: fullName,
          value: parseInt(s.total_sold) || 0
        };
      });
      setTopServices(formattedServices);
      setTopBranches(brnRes.data);
    } catch {
      showToast('Gagal memuat data overview', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterMode, startDate, endDate, filterMonth, filterYear, activeBranchId, token]);

  const fetchTransactions = useCallback(async () => {
    try {
      const p = activeBranchId ? `?branch_id=${activeBranchId}` : '';
      const h = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/api/admin/transactions${p}`, { headers: h });
      setTransactions(res.data);
    } catch {
      showToast('Gagal memuat transaksi', 'error');
    }
  }, [activeBranchId, token]);

  useEffect(() => {
    if (activeTab === 'overview') fetchOverviewData();
    else fetchTransactions();
  }, [activeTab, fetchOverviewData, fetchTransactions]);

  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!txForm.category || !txForm.amount) return showToast('Lengkapi data', 'error');
    try {
      const h = { Authorization: `Bearer ${token}` };
      await axios.post('/api/admin/transactions', txForm, { headers: h });
      showToast('Transaksi berhasil ditambahkan');
      setShowTxForm(false);
      setTxForm({ type: 'pengeluaran', category: '', amount: '', description: '', date: '' });
      fetchTransactions();
      fetchOverviewData(); // Update financial numbers behind the scenes
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal menyimpan transaksi', 'error');
    }
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm('Hapus catatan ini?')) return;
    try {
      const h = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/transactions/${id}`, { headers: h });
      showToast('Transaksi dihapus');
      fetchTransactions();
      fetchOverviewData();
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  // CSV export
  const exportCSV = () => {
    const rows = [['Tanggal', 'Pendapatan (Rp)'], ...chartData.map(d => [fmtDate(d.date), d.total])];
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

  const exportPDF = () => {
    window.print();
  };

  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

  // RENDER OVERVIEW
  const renderOverview = () => (
    <>
      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={statCardStyle}>
          <div style={iconWrapperStyle('#3b82f6', '#eff6ff')}><FiTrendingUp /></div>
          <div>
            <div style={statLabelStyle}>Pendapatan Cucian</div>
            <div style={statValueStyle}>{fmtRp(financial?.orders_revenue)}</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={iconWrapperStyle('#14b8a6', '#f0fdfa')}><FiPlus /></div>
          <div>
            <div style={statLabelStyle}>Pendapatan Lain</div>
            <div style={statValueStyle}>{fmtRp(financial?.manual_income)}</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={iconWrapperStyle('#ef4444', '#fef2f2')}><FiTrendingDown /></div>
          <div>
            <div style={statLabelStyle}>Pengeluaran</div>
            <div style={statValueStyle}>{fmtRp(financial?.manual_expense)}</div>
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...iconWrapperStyle('#8b5cf6', '#f5f3ff'), background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white' }}>
            <FiDollarSign />
          </div>
          <div>
            <div style={{...statLabelStyle, color: '#4f46e5', fontWeight: 600}}>Laba Bersih</div>
            <div style={{...statValueStyle, color: '#312e81', fontSize: '1.4rem'}}>{fmtRp(financial?.net_revenue)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Main Chart */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <h3 style={cardTitleStyle}><FiActivity /> Trend Pendapatan</h3>
          <div style={chartData.length > 0 
            ? { height: 320, width: '100%', marginTop: '1rem' } 
            : { height: 320, width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis tickFormatter={(val) => `Rp ${val/1000}k`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <RechartsTooltip 
                    formatter={(value) => [fmtRp(value), 'Total']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                <FiBarChart2 style={{ fontSize: '2.5rem', color: '#cbd5e1' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Tidak ada data transaksi pendapatan di periode ini</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Services */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <h3 style={cardTitleStyle}><FiPieChart /> Layanan Terlaris</h3>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '24px', marginTop: '1.5rem' }}>
            {topServices.length > 0 ? (
              <>
                {/* Chart Container */}
                <div style={{ width: 180, height: 180, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topServices}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return percent > 0.05 ? (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          ) : null;
                        }}
                      >
                        {topServices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 180px', minWidth: 180 }}>
                  {topServices.map((item, index) => {
                    const total = topServices.reduce((sum, s) => sum + s.value, 0);
                    const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: COLORS[index % COLORS.length],
                          marginTop: '4px',
                          flexShrink: 0
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                            {item.value} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>({percent}%)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', height: 180, alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Belum ada data layanan</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Branches (Only if no activeBranchId) */}
        {!activeBranchId && (
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
            <h3 style={cardTitleStyle}><FiBriefcase /> Performa Cabang</h3>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '24px', marginTop: '1.5rem' }}>
              {topBranches.length > 0 ? (
                <>
                  {/* Chart Container */}
                  <div style={{ width: 180, height: 180, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topBranches.map(b => ({ name: b.branch_name, value: parseFloat(b.total_revenue) || 0 }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                            return percent > 0.05 ? (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            ) : null;
                          }}
                        >
                          {topBranches.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 180px', minWidth: 180 }}>
                    {topBranches.map((item, index) => {
                      const total = topBranches.reduce((sum, b) => sum + (parseFloat(b.total_revenue) || 0), 0);
                      const percent = total > 0 ? Math.round(((parseFloat(item.total_revenue) || 0) / total) * 100) : 0;
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: COLORS[index % COLORS.length],
                            marginTop: '4px',
                            flexShrink: 0
                          }} />
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {item.branch_name}
                            </span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                              {fmtRp(item.total_revenue)} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>({percent}%)</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', height: 180, alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Belum ada data cabang</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // RENDER TRANSACTIONS
  const renderTransactions = () => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={cardTitleStyle}>Riwayat Transaksi Keuangan</h3>
        <button className="btn btn-primary" onClick={() => setShowTxForm(true)} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <FiPlus /> Tambah Catatan
        </button>
      </div>

      {showTxForm && (
        <form onSubmit={handleCreateTx} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#1e293b' }}>Catat Transaksi Baru</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Tipe</label>
              <select className="form-input" value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})} required>
                <option value="pengeluaran">Pengeluaran</option>
                <option value="pendapatan_lain">Pemasukan Lain</option>
                <option value="utang">Utang</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Kategori</label>
              <input type="text" className="form-input" placeholder="Misal: Listrik, Gaji, dll" value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} required />
            </div>
            <div>
              <label style={labelStyle}>Nominal (Rp)</label>
              <input type="number" className="form-input" placeholder="150000" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} required />
            </div>
            <div>
              <label style={labelStyle}>Tanggal</label>
              <input type="date" className="form-input" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} required />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Keterangan Tambahan</label>
            <input type="text" className="form-input" placeholder="Opsional..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowTxForm(false)}>Batal</button>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </div>
        </form>
      )}

      {/* Desktop view */}
      <div className="desktop-transactions-view">
        <div className="table-responsive">
          <table className="admin-order-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Belum ada catatan keuangan.</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{fmtDate(tx.date)}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: tx.type === 'pengeluaran' ? '#fef2f2' : tx.type === 'pendapatan_lain' ? '#f0fdfa' : '#fffbeb',
                        color: tx.type === 'pengeluaran' ? '#ef4444' : tx.type === 'pendapatan_lain' ? '#0d9488' : '#d97706'
                      }}>
                        {tx.type === 'pengeluaran' ? 'Pengeluaran' : tx.type === 'pendapatan_lain' ? 'Pemasukan Lain' : 'Utang'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{tx.category}</td>
                    <td>{tx.description || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtRp(tx.amount)}</td>
                    <td>
                      <button onClick={() => handleDeleteTx(tx.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view */}
      <div className="mobile-transactions-view" style={{ display: 'none' }}>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Belum ada catatan keuangan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.map(tx => (
              <div key={tx.id} style={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                    background: tx.type === 'pengeluaran' ? '#fef2f2' : tx.type === 'pendapatan_lain' ? '#f0fdfa' : '#fffbeb',
                    color: tx.type === 'pengeluaran' ? '#ef4444' : tx.type === 'pendapatan_lain' ? '#0d9488' : '#d97706'
                  }}>
                    {tx.type === 'pengeluaran' ? 'Pengeluaran' : tx.type === 'pendapatan_lain' ? 'Pemasukan Lain' : 'Utang'}
                  </span>
                  <button onClick={() => handleDeleteTx(tx.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                    <FiTrash2 size={16} />
                  </button>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--navy)' }}>{tx.category}</div>
                  {tx.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '2px' }}>{tx.description}</div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>{fmtDate(tx.date)}</span>
                  <span style={{ fontWeight: 800, color: tx.type === 'pengeluaran' ? '#ef4444' : '#10b981', fontSize: '1rem' }}>
                    {tx.type === 'pengeluaran' ? '-' : '+'}{fmtRp(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 0 2rem' }} id="laporan-print-area">
      <style>{`
        .desktop-transactions-view {
          display: block;
        }
        .mobile-transactions-view {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-transactions-view {
            display: none !important;
          }
          .mobile-transactions-view {
            display: block !important;
          }
        }
      `}</style>
      {/* HEADER TABS */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ ...tabStyle, borderBottom: activeTab === 'overview' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'overview' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'overview' ? 600 : 500 }}
        >
          <FiBarChart2 /> Dashboard Analisis
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          style={{ ...tabStyle, borderBottom: activeTab === 'transactions' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'transactions' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'transactions' ? 600 : 500 }}
        >
          <FiDollarSign /> Catatan Keuangan
        </button>
      </div>

      {/* FILTER BAR FOR OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginRight: '0.5rem' }}><FiFilter /> Filter:</span>
            <select className="form-input" style={{ width: 'auto', padding: '6px 12px', height: '36px' }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
              <option value="range">Rentang Tanggal</option>
            </select>

            {filterMode === 'month' && (
              <>
                <select className="form-input" style={{ width: 'auto', padding: '6px 12px', height: '36px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                  {MONTHS_ID.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                </select>
                <select className="form-input" style={{ width: 'auto', padding: '6px 12px', height: '36px' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}

            {filterMode === 'year' && (
              <select className="form-input" style={{ width: 'auto', padding: '6px 12px', height: '36px' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}

            {filterMode === 'range' && (
              <>
                <input type="date" className="form-input" style={{ width: 'auto', padding: '6px 12px', height: '36px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span style={{ color: '#94a3b8' }}>-</span>
                <input type="date" className="form-input" style={{ width: 'auto', padding: '6px 12px', height: '36px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}><FiDownload /> CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={exportPDF}><FiPrinter /> Cetak</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Memuat data laporan...</div>
      ) : (
        activeTab === 'overview' ? renderOverview() : renderTransactions()
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, right: 30, zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// --- STYLES ---
const tabStyle = {
  background: 'none',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s',
  borderTop: 'none', borderLeft: 'none', borderRight: 'none'
};

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)',
  borderRadius: '16px',
  padding: '1.5rem'
};

const statCardStyle = {
  ...cardStyle,
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.25rem 1.5rem'
};

const iconWrapperStyle = (color, bg) => ({
  width: 48, height: 48, borderRadius: '12px',
  background: bg, color: color,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1.5rem'
});

const statLabelStyle = {
  fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '2px'
};

const statValueStyle = {
  fontSize: '1.25rem', fontWeight: 700, color: '#1e293b'
};

const cardTitleStyle = {
  fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0
};

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px'
};

export default LaporanTab;