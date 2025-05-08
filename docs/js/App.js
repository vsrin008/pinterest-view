/* eslint-disable react/prop-types */
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

function App() {
  return (
    <div className="app">
      <nav style={{ padding: '20px', backgroundColor: '#f5f5f5', marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '20px' }}>Simplified Demo</Link>
        <Link to="/balanced">Balanced Grid Demo</Link>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
