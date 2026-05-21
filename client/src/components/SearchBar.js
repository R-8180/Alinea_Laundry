import React from 'react';
import { FiSearch } from 'react-icons/fi';

/**
 * Reusable SearchBar Component
 * 
 * @param {string} value - Current value of the search input
 * @param {function} onChange - Callback function when input changes
 * @param {string} placeholder - Placeholder text for the input
 */
const SearchBar = ({ value, onChange, placeholder = "Cari..." }) => {
  return (
    <div className="admin-search" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <FiSearch style={{ color: 'var(--text-3)', marginRight: '8px' }} />
      <input 
        type="text" 
        placeholder={placeholder} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: 'var(--text)' }}
      />
    </div>
  );
};

export default SearchBar;
