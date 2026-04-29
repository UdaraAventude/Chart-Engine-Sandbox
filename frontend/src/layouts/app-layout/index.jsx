import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './AppLayout.css';

const AppLayout = () => {
  return (
    <div className='app-root'>
      <nav className='app-nav'>
        <NavLink
          to='/'
          end
          className={({ isActive }) =>
            `nav-link${isActive ? ' nav-link--active' : ''}`
          }
        >
          Drill-Down
        </NavLink>
        <NavLink
          to='/dashboard'
          className={({ isActive }) =>
            `nav-link${isActive ? ' nav-link--active' : ''}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to='/builder'
          className={({ isActive }) =>
            `nav-link nav-link--builder${isActive ? ' nav-link--active' : ''}`
          }
        >
          Chart Builder
        </NavLink>
      </nav>

      <main className='app-main'>
        <Outlet />
      </main>

      <footer className='eval-footer app-footer'>
        <p>Advanced Hierarchical Analytics Platform • Apache ECharts</p>
      </footer>
    </div>
  );
};

export default AppLayout;
