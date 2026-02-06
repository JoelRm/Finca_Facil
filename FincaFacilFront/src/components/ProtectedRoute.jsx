import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    // Mientras carga el estado desde localStorage:
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-xs text-gray-500">Verificando sesión...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // redirige a /login y recuerda a dónde querías ir
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}
