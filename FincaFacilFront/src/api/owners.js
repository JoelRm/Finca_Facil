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
  const headers = {};

  if (auth?.communityId) headers["X-Community-Id"] = String(auth.communityId);
  if (auth?.email) headers["X-User-Email"] = String(auth.email);

  return headers;
}

export async function getCommunityMorosidad(communityId, anio, hastaMes = 12) {
  const qs = new URLSearchParams({
    communityId: String(communityId),
    anio: String(anio),
    hastaMes: String(hastaMes),
  });

  const r = await fetch(
    `${BASE_URL}/communities/${communityId}/morosidad?${qs.toString()}`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || "Error obteniendo morosidad");
  }

  return r.json();
}