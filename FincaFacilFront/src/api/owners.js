const BASE_URL = "http://localhost:3000/api";

export async function getCommunityMorosidad(communityId, anio, hastaMes = 12) {
  const qs = new URLSearchParams({
    anio: String(anio),
    hastaMes: String(hastaMes),
  });

  const r = await fetch(`${BASE_URL}/communities/${communityId}/morosidad?${qs.toString()}`);
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || "Error obteniendo morosidad");
  }
  return r.json();
}
