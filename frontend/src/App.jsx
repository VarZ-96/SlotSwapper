// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Import Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Requests from './pages/Requests';

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/requests" element={<Requests />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
