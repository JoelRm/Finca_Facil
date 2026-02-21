import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from "../assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ruta a la que queríamos ir antes de caer en login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Error iniciando sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* logo */}
    <div className="flex justify-center mb-4">
  <img
    src={logo}
    alt="Finca Fácil"
    className="w-24 h-24 rounded-full object-contain bg-white p-2 shadow border border-gray-200"
  />
</div>
        <h1 className="text-center text-sm font-semibold text-gray-900">
          Finca Fácil
        </h1>
        <p className="text-center text-xs text-gray-500 mb-6">
          Inicia sesión para ver tu dashboard
        </p>

        {error && (
          <div className="mb-3 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent"
              placeholder="tucorreo@finca.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 mt-2 rounded-xl bg-purple-600 text-white text-xs font-medium flex items-center justify-center hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-gray-400 text-center">
          Puedes usar cualquier correo y contraseña
          <br />
          (mock de autenticación local).
        </p>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="mt-3 w-full h-9 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Crear cuenta
        </button>
      </div>
    </div>
  );
}
