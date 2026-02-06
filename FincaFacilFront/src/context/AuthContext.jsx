import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

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

  const login = async (email, password) => {
    // 👇 Aquí podrías llamar a tu backend real de login
    // Por ahora validamos algo simple:
    if (!email || !password) {
      throw new Error('Debes ingresar usuario y contraseña');
    }

    // Demo: usuario “falso”
    const fakeUser = {
      email,
      name: 'Usuario Finca Fácil',
    };

    setUser(fakeUser);
    localStorage.setItem('ff_auth_user', JSON.stringify(fakeUser));
    return fakeUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ff_auth_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    initializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
