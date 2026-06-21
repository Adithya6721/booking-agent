import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Transportation from './pages/Transportation';
import Hotels from './pages/Hotels';
import AIPlanner from './pages/AIPlanner';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transportation" element={<Transportation />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/ai-planner" element={<AIPlanner />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
