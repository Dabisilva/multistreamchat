import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load components for better performance
const App = lazy(() => import('../App'));
const Login = lazy(() => import('../pages/Login'));

// Loading component
const LoadingScreen: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  }}>
    Carregando...
  </div>
);

// Protected Route wrapper
interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = () => {
    const twitchToken = localStorage.getItem('twitchToken');

    // Check URL params for authentication (widget URL)
    const urlParams = new URLSearchParams(window.location.search);
    const hasTwitchAuth = urlParams.has('twitchChannel') && urlParams.has('twitchToken');
    const hasKickChannel = urlParams.has('kickChannel'); // Kick doesn't need OAuth

    return (twitchToken || hasTwitchAuth || hasKickChannel);
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Note: Login page doesn't need a route guard
// It handles its own authentication state and shows widget URL when authenticated

// Main routes component
export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Login route - no guard needed, handles its own state */}
        <Route path="/login" element={<Login />} />

        {/* Protected route - requires authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

