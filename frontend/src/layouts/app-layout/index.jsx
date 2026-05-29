import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import "./AppLayout.css";

const AppLayout = () => {
  return (
    <div className="app-root">
      <header className="app-header">
        <NavLink
          to="/"
          className="app-header-brand"
          aria-label="ChartEngine home"
        >
          <div className="app-header-logomark">CE</div>
          <div className="app-header-wordmark">
            Chart<span>Engine</span>
          </div>
        </NavLink>

        <nav className="header-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link-top${isActive ? " active" : ""}`
            }
          >
            Dashboard
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer" />
    </div>
  );
};

export default AppLayout;
