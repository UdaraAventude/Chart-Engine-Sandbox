import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const AppLayout = () => {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <NavLink
          to='/'
          end
          style={({ isActive }) => ({
            padding: '6px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            color: isActive ? '#2563eb' : '#64748b',
            background: isActive ? '#eff6ff' : 'transparent',
          })}
        >
          Drill-Down
        </NavLink>
        <NavLink
          to='/dashboard'
          style={({ isActive }) => ({
            padding: '6px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            color: isActive ? '#2563eb' : '#64748b',
            background: isActive ? '#eff6ff' : 'transparent',
          })}
        >
          Dashboard
        </NavLink>
        <NavLink
          to='/builder'
          style={({ isActive }) => ({
            padding: '6px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            color: isActive ? '#9333ea' : '#64748b',
            background: isActive ? '#faf5ff' : 'transparent',
          })}
        >
          Chart Builder
        </NavLink>
      </nav>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className='eval-footer' style={{ paddingBottom: '40px' }}>
        <p>Advanced Hierarchical Analytics Platform • Apache ECharts</p>
      </footer>
    </div>
  );
};

export default AppLayout;
