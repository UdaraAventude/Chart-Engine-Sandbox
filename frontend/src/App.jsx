import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import BenchmarkingPage from './components/BenchmarkingPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/benchmarking" element={<BenchmarkingPage />} />
      </Routes>
      <footer className="eval-footer" style={{ paddingBottom: '40px' }}>
        <p>Advanced Hierarchical Analytics Platform • Apache ECharts • Plotly.js • Recharts • D3.js</p>
      </footer>
    </Router>
  );
}

export default App;
