const API_URL = 'http://localhost:3000/api';

export const getFiltros = () =>
  fetch(`${API_URL}/filtros`).then(r => r.json());

export const getKpis = (anio, mes) =>
  fetch(`${API_URL}/kpis?anio=${anio}&mes=${mes ?? ''}`)
    .then(r => r.json());

export const getCategorias = (anio, mes) =>
  fetch(`${API_URL}/categorias?anio=${anio}&mes=${mes ?? ''}`)
    .then(r => r.json());

export const getEvolucion = anio =>
  fetch(`${API_URL}/evolucion?anio=${anio}`)
    .then(r => r.json());
