const API_URL = 'http://localhost:3000/api';

const handleResponse = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
};

// GET /api/filtros
export const getFiltros = () => {
  return fetch(`${API_URL}/filtros`).then(handleResponse);
};

// GET /api/kpis?anio=&mes=&bankId=
export const getKpis = (anio, mes = null, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  if (mes) params.append('mes', mes);
  if (bankId) params.append('bankId', bankId);

  return fetch(`${API_URL}/kpis?${params.toString()}`).then(handleResponse);
};

// GET /api/evolucion?anio=&bankId=
export const getEvolucion = (anio, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  if (bankId) params.append('bankId', bankId);

  return fetch(`${API_URL}/evolucion?${params.toString()}`).then(handleResponse);
};

// GET /api/categorias?anio=&mes=&bankId=
export const getCategorias = (anio, mes = null, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  if (mes) params.append('mes', mes);
  if (bankId) params.append('bankId', bankId);

  return fetch(`${API_URL}/categorias?${params.toString()}`).then(handleResponse);
};

// (Opcional) GET /api/gastos-por-categoria?anio=&mes=&bankId=
export const getGastosPorCategoria = (anio, mes, bankId = null) => {
  const params = new URLSearchParams();
  params.append('anio', anio);
  params.append('mes', mes);
  if (bankId) params.append('bankId', bankId);

  return fetch(`${API_URL}/gastos-por-categoria?${params.toString()}`).then(handleResponse);
};

export const getMovimientos = (
  anio,
  bankId,
  categoriaId,
  tipo,       // 'pagos' | 'cobros' | undefined
  limit = 500,
  offset = 0
) => {
  let url = `${API_URL}/movimientos?anio=${anio}&limit=${limit}&offset=${offset}`;

  if (bankId) url += `&bankId=${bankId}`;
  if (categoriaId) url += `&categoriaId=${categoriaId}`;
  if (tipo) url += `&tipo=${tipo}`;

  return fetch(url).then(handleResponse);
};

export const getBancos = () =>
  fetch(`${API_URL}/bancos`).then(handleResponse);
