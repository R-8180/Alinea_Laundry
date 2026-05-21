import React, { forwardRef } from 'react';

const formatRupiah = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

const Receipt = forwardRef(({ order }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} style={{
      padding: '20px',
      width: '320px',
      background: '#ffffff',
      color: '#000000',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '12px',
      lineHeight: '1.4',
      margin: '0',
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>ALINEA LAUNDRY</h2>
        <div style={{ fontSize: '11px' }}>{order.branch_name ? `Cabang: ${order.branch_name}` : 'Layanan Laundry Premium'}</div>
        <div style={{ fontSize: '11px' }}>Telp: 0812-3456-7890</div>
      </div>
      
      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
      
      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={{ width: '70px', padding: '2px 0' }}>Order ID</td><td style={{ padding: '2px 0' }}>: #{order.id} / {order.order_code}</td></tr>
          <tr><td style={{ padding: '2px 0' }}>Tanggal</td><td style={{ padding: '2px 0' }}>: {new Date(order.created_at).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td></tr>
          <tr><td style={{ padding: '2px 0' }}>Pelanggan</td><td style={{ padding: '2px 0' }}>: {order.customer_name}</td></tr>
          <tr><td style={{ padding: '2px 0' }}>Layanan</td><td style={{ padding: '2px 0' }}>: {order.service_speed === 'express' ? 'Express' : 'Reguler'}</td></tr>
        </tbody>
      </table>

      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

      <div style={{ width: '100%', fontSize: '12px' }}>
        {order.items?.map((item, idx) => {
          const qty = item.service_type === 'kiloan' ? item.weight : item.qty_items;
          const unit = item.service_type === 'kiloan' ? 'kg' : 'pcs';
          const price = item.price_per_unit || 0;
          const subtotal = qty * price;
          return (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>{item.name || item.service_type}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{qty} {unit} x {formatRupiah(price)}</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '2px 0' }}>Subtotal</td>
            <td style={{ textAlign: 'right', padding: '2px 0' }}>{formatRupiah(order.total_price - (order.additional_charge || 0))}</td>
          </tr>
          {order.additional_charge > 0 && (
            <tr>
              <td style={{ padding: '2px 0' }}>Biaya Tambahan</td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{formatRupiah(order.additional_charge)}</td>
            </tr>
          )}
          <tr>
            <td style={{ paddingTop: '8px', fontWeight: 'bold', fontSize: '14px' }}>TOTAL</td>
            <td style={{ paddingTop: '8px', fontWeight: 'bold', fontSize: '14px', textAlign: 'right' }}>{formatRupiah(order.total_price)}</td>
          </tr>
          <tr>
            <td style={{ paddingTop: '8px' }}>Status Bayar</td>
            <td style={{ paddingTop: '8px', textAlign: 'right', fontWeight: 'bold' }}>{order.payment_status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderBottom: '1px dashed #000', margin: '15px 0 10px 0' }}></div>

      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '15px' }}>
        <div style={{ fontWeight: 'bold' }}>Terima Kasih!</div>
        <div style={{ marginTop: '4px' }}>Barang yang tidak diambil dalam 1 bulan</div>
        <div>bukan tanggung jawab kami.</div>
        <div style={{ marginTop: '10px' }}>-- alinealaundry.com --</div>
      </div>
    </div>
  );
});

export default Receipt;
