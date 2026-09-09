/**
 * App.jsx — the root component and routing logic.
 *
 * Two routes: / (login/signup) and /feed (main feed).
 * ProtectedRoute wraps the feed so unauthenticated users can't access it.
 * On mount, AuthProvider syncs the user profile from the server to get
 * the latest following list.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';
import AuthPage from './components/AuthPage';
import FeedPage from './components/FeedPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/feed" replace /> : <AuthPage />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <NavBar />
            <Container className="app-shell mt-4">
              <FeedPage />
            </Container>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/feed' : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}