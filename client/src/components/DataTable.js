import React from 'react';

/**
 * Reusable DataTable Component
 * 
 * @param {Array} columns - Array of column objects { key, label, render(item) }
 * @param {Array} data - Array of data objects
 * @param {boolean} loading - Loading state
 * @param {string} emptyMessage - Message to show when data is empty
 */
const DataTable = ({ columns, data, loading, emptyMessage = "Tidak ada data" }) => {
  return (
    <div className="admin-table-card" style={{ marginTop: 12 }}>
      <div className="table-responsive">
        <table className="admin-order-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="empty-cell">Memuat data...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-cell">{emptyMessage}</td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr key={item.id || rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx}>
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
