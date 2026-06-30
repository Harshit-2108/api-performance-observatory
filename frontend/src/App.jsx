import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StatusPage from './pages/StatusPage';
import SLAReports from './pages/SLAReports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/status" element={<StatusPage />} />

          {/* Protected Console Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <SLAReports />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect Hook */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
