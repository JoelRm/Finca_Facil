const BASE_URL = "http://localhost:3000/api";

export async function getCommunityOwnersMonthly(communityId, anio, hastaMes = 12, bankId = null) {
  const qs = new URLSearchParams({
    anio: String(anio),
    hastaMes: String(hastaMes),
  });

  const r = await fetch(`${BASE_URL}/communities/${communityId}/owners/monthly?${qs.toString()}`);
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || "Error obteniendo grilla owners/monthly");
  }
  return r.json();
}
