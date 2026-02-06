import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CategoriasPage from './pages/CategoriasPage';
import MovimientosPage from './pages/MovimientosPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/movimientos" element={<MovimientosPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
      </Routes>
    </Router>
  );
}
