import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import DashboardPage from './pages/DashboardPage';
import BenchmarkingPage from './pages/BenchmarkingPage';
import ChartBuilderPage from './pages/ChartBuilderPage';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/benchmarking" element={<BenchmarkingPage />} />
        <Route path="/builder" element={<ChartBuilderPage />} />
      </Routes>
      <footer className="eval-footer" style={{ paddingBottom: '40px' }}>
        <p>Advanced Hierarchical Analytics Platform • Apache ECharts • Plotly.js • Recharts • D3.js</p>
      </footer>
    </Router>
  );
}

export default App;
