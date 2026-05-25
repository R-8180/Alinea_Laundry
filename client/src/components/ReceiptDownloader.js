import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import Receipt from './Receipt';

const ReceiptDownloader = ({ order }) => {
  const receiptRef = useRef(null);
  const [loadingPng, setLoadingPng] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const downloadPNG = async () => {
    if (!receiptRef.current) return;
    setLoadingPng(true);
    try {
      // Temporarily make it visible for capture (html2canvas requires element to be rendered in viewport/layout)
      const element = receiptRef.current;
      element.style.position = 'absolute';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-1';
      element.style.visibility = 'visible';

      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      
      // Re-hide it
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      element.style.visibility = 'hidden';

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Struk_Alinea_${order.order_code}.png`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPng(false);
    }
  };

  const downloadPDF = async () => {
    if (!receiptRef.current) return;
    setLoadingPdf(true);
    try {
      const element = receiptRef.current;
      element.style.position = 'absolute';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-1';
      element.style.visibility = 'visible';

      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      element.style.visibility = 'hidden';

      const imgData = canvas.toDataURL('image/png');
      // A4 is 595.28 x 841.89 pt. 
      // We will make the PDF size exactly match the canvas scaled size.
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Struk_Alinea_${order.order_code}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
      <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#334155' }}>Cetak Struk Transaksi</h4>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={downloadPNG} 
          disabled={loadingPng || loadingPdf} 
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
        >
          <FiDownload /> {loadingPng ? 'Memproses...' : 'Ekspor PNG'}
        </button>
        <button 
          className="btn" 
          onClick={downloadPDF} 
          disabled={loadingPng || loadingPdf} 
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', border: 'none' }}
        >
          <FiPrinter /> {loadingPdf ? 'Memproses...' : 'Ekspor PDF'}
        </button>
      </div>

      {/* Hidden container for rendering */}
      <div style={{ overflow: 'hidden', position: 'absolute', width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
          <Receipt ref={receiptRef} order={order} />
        </div>
      </div>
    </div>
  );
};

export default ReceiptDownloader;
