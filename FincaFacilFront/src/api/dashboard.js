const API_URL = 'http://localhost:3000/api';

function getStoredAuth() {
  try {
    const raw = localStorage.getItem('ff_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildAuthHeaders(extra = {}) {
  const auth = getStoredAuth();

  const headers = {
    ...extra,
  };

  // ✅ communityId requerido por backend
  if (auth?.communityId) {
    headers['X-Community-Id'] = String(auth.communityId);
  }

  // ✅ recomendado (muchos endpoints lo usan, ej /auth/profile)
  if (auth?.email) {
    headers['X-User-Email'] = String(auth.email);
  }

  return headers;
}

const handleResponse = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
};

// helper fetch con headers
function apiFetch(path, options = {}) {
  const headers = buildAuthHeaders(options.headers || {});
  return fetch(`${API_URL}${path}`, { ...options, headers }).then(handleResponse);
}

// GET /api/filtros
export const getFiltros = () => apiFetch('/filtros');

// GET /api/kpis?anio=&mes=&bankId=
export const getKpis = (anio, mes = null, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  if (mes) params.append('mes', mes);
  if (bankId) params.append('bankId', bankId);

  return apiFetch(`/kpis?${params.toString()}`);
};

// GET /api/evolucion?anio=&bankId=
export const getEvolucion = (anio, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  if (bankId) params.append('bankId', bankId);

  return apiFetch(`/evolucion?${params.toString()}`);
};

// GET /api/categorias?anio=&mes=&bankId=
export const getCategorias = (anio, mes = null, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  if (mes) params.append('mes', mes);
  if (bankId) params.append('bankId', bankId);

  return apiFetch(`/categorias?${params.toString()}`);
};

// GET /api/gastos-por-categoria?anio=&mes=&bankId=
export const getGastosPorCategoria = (anio, mes, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  params.append('mes', mes);
  if (bankId) params.append('bankId', bankId);

  return apiFetch(`/gastos-por-categoria?${params.toString()}`);
};

// GET /api/movimientos?anio=&limit=&offset=&bankId=&categoriaId=&tipo=
export const getMovimientos = (
  anio,
  bankId,
  categoriaId,
  tipo,       // 'pagos' | 'cobros' | undefined
  limit = 500,
  offset = 0
) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  params.append('limit', limit);
  params.append('offset', offset);

  if (bankId) params.append('bankId', bankId);
  if (categoriaId) params.append('categoriaId', categoriaId);
  if (tipo) params.append('tipo', tipo);

  return apiFetch(`/movimientos?${params.toString()}`);
};

// GET /api/bancos
export const getBancos = () => apiFetch('/bancos');