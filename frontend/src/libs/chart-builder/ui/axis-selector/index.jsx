import React from 'react';

export const AxisSelector = ({ name, label, value, onChange, options }) => {
  return (
    <div
      style={{
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <label
        htmlFor={name}
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '14px',
          color: '#1e293b',
          backgroundColor: 'white',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value='' disabled>
          Select {label.toLowerCase()}...
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {String(opt).replace(/_/g, ' ').toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};
