import React from 'react';

export const ConfigInput = ({ name, label, value, onChange, placeholder }) => {
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
      <input
        id={name}
        name={name}
        type='text'
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label}...`}
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '14px',
          color: '#1e293b',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
        onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
      />
    </div>
  );
};
