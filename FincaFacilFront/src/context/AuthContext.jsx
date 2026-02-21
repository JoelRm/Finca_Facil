import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('ff_auth_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('ff_auth_user');
      }
    }
    setInitializing(false);
  }, []);

  // ✅ LOGIN REAL
  const login = async (email, password) => {
    if (!email) throw new Error('Debes ingresar correo');

    const data = await apiPost('/api/auth/login', { email });

    if (!data?.ok) throw new Error('No se pudo iniciar sesión');
    if (data.userExists === false) throw new Error('Usuario no existe. Regístrate primero.');

    // ✅ toma communityId desde defaultCommunity
    const communityId = data?.defaultCommunity?.id
      ? Number(data.defaultCommunity.id)
      : null;

    const savedUser = {
      email: data.user?.email || email,
      name: data.user?.full_name || 'Usuario Finca Fácil',
      userId: data.user?.id ? Number(data.user.id) : undefined,

      // ✅ guardamos comunidad en sesión
      communityId,
      defaultCommunity: data.defaultCommunity || null,
      communities: Array.isArray(data.communities) ? data.communities : [],
    };

    setUser(savedUser);
    localStorage.setItem('ff_auth_user', JSON.stringify(savedUser));
    return savedUser;
  };

  // ✅ REGISTER REAL
  const register = async (email, communityId) => {
    if (!email) throw new Error('Debes ingresar correo');
    if (!communityId || Number(communityId) <= 0) throw new Error('communityId es obligatorio');

    const data = await apiPost('/api/auth/register', {
      email,
      communityId: Number(communityId),
    });

    if (!data?.ok) throw new Error('No se pudo registrar');

    const savedUser = {
      email: data.user?.email || email,
      name: data.user?.full_name || 'Usuario Finca Fácil',
      userId: data.user?.id ? Number(data.user.id) : undefined,

      // ✅ aquí ya tienes comunidad
      communityId: data.community?.id ? Number(data.community.id) : Number(communityId),
      community: data.community || null,
      membership: data.membership || null,
    };

    setUser(savedUser);
    localStorage.setItem('ff_auth_user', JSON.stringify(savedUser));
    return data;
  };

  const logout = () => {
    setUser(null);

    // ✅ elimina TODO (incluye communityId porque está dentro del objeto)
    localStorage.removeItem('ff_auth_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    initializing,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}