import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');

  // comunidades
  const [communities, setCommunities] = useState([]);
  const [communityId, setCommunityId] = useState(''); // id seleccionado

  const [loading, setLoading] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingCommunities(true);
        const data = await apiGet('/communities');

        // tu API retorna: { ok, total, communities: [...] }
        const list = Array.isArray(data?.communities) ? data.communities : [];

        if (!mounted) return;
        setCommunities(list);

        // selecciona el primero por default si existe
        if (list.length && !communityId) {
          setCommunityId(String(list[0].id));
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'No se pudieron cargar comunidades');
      } finally {
        if (mounted) setLoadingCommunities(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    const cid = Number(communityId);
    return (
      email.trim().length > 3 &&
      Number.isFinite(cid) &&
      cid > 0 &&
      !loading &&
      !loadingCommunities
    );
  }, [email, communityId, loading, loadingCommunities]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await register(email.trim().toLowerCase(), Number(communityId));
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || 'Error registrando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* logo */}
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-pink-400 via-orange-300 to-yellow-300" />
        </div>

        <h1 className="text-center text-sm font-semibold text-gray-900">
          Finca Fácil
        </h1>
        <p className="text-center text-xs text-gray-500 mb-6">
          Regístrate para entrar a tu comunidad
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
              Comunidad
            </label>

            {loadingCommunities ? (
              <div className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs flex items-center text-gray-400">
                Cargando comunidades...
              </div>
            ) : (
              <select
                className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            )}

            {!loadingCommunities && communities.length === 0 && (
              <p className="mt-1 text-[10px] text-gray-400">
                No hay comunidades disponibles.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-9 mt-2 rounded-xl bg-purple-600 text-white text-xs font-medium flex items-center justify-center hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[11px] text-purple-600 hover:underline"
          >
            Ya tengo cuenta — Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}