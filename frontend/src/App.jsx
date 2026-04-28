import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Providers from './providers';
import AppRouter from './router';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Providers>
        <AppRouter />
      </Providers>
    </Router>
  );
}

export default App;
