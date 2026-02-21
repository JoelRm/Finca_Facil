// src/api/ownersMonthly.js
const BASE_URL = "http://localhost:3000/api";

function getAuthFromStorage() {
  try {
    const raw = localStorage.getItem("ff_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildHeaders() {
  const auth = getAuthFromStorage();
  const headers = { "Content-Type": "application/json" };

  if (auth?.communityId) headers["X-Community-Id"] = String(auth.communityId);
  if (auth?.email) headers["X-User-Email"] = String(auth.email);

  return headers;
}

async function handleJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function getCommunityOwnersMonthly(communityId, anio, hastaMes = 12, bankId = null) {
  const qs = new URLSearchParams({
    anio: String(anio),
    hastaMes: String(hastaMes),
  });

  if (bankId) qs.append("bankId", String(bankId));

  const r = await fetch(`${BASE_URL}/communities/${communityId}/owners/monthly?${qs.toString()}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return handleJson(r);
}

/**
 * ✅ Asigna un monto (delta) desde NO IDENTIFICADO (sourceMes)
 * hacia el cliente en un mes objetivo (targetMes).
 *
 * - delta: puede ser incremental (ej: 50 hoy, 50 mañana).
 * - backend debería validar disponible y no permitir exceder.
 */
export async function allocateUnidentifiedPayment({
  communityId,
  anio,
  sourceMes,
  targetMes,
  clientId,
  delta,
}) {
  const r = await fetch(`${BASE_URL}/payments/unidentified/allocate`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify({
      communityId: Number(communityId),
      anio: Number(anio),
      sourceMes: Number(sourceMes),
      targetMes: Number(targetMes),
      clientId: Number(clientId),
      delta: Number(delta),
    }),
  });

  return handleJson(r);
}