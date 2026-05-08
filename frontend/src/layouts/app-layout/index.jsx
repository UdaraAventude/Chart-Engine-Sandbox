import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './AppLayout.css';

const AppLayout = () => {
  return (
    <div className='app-root'>
      <header className='app-header'>
        <nav className='header-nav'>
          <NavLink
            to='/'
            end
            className={({ isActive }) =>
              `nav-link-top${isActive ? ' active' : ''}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to='/builder'
            className={({ isActive }) =>
              `nav-link-top${isActive ? ' active' : ''}`
            }
          >
            Chart Builder
          </NavLink>
        </nav>
      </header>

      <main className='app-main'>
        <Outlet />
      </main>

      <footer className='app-footer'>
      </footer>

    </div>
  );
};

export default AppLayout;



