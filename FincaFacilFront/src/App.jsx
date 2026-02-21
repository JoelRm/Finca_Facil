import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Movimientos from './pages/MovimientosPage';
import CategoriasPage from './pages/CategoriasPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import OwnersGridPage from './pages/OwnersGridPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owners-grid"
          element={
            <ProtectedRoute>
              <OwnersGridPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/movimientos"
          element={
            <ProtectedRoute>
              <Movimientos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categorias"
          element={
            <ProtectedRoute>
              <CategoriasPage />
            </ProtectedRoute>
          }
        />

        {/* Si quieres que /ajustes sea privada también */}
        {/* 
        <Route
          path="/ajustes"
          element={
            <ProtectedRoute>
              <AjustesPage />
            </ProtectedRoute>
          }
        /> 
        */}
      </Routes>
    </AuthProvider>
  );
}

export default App;
