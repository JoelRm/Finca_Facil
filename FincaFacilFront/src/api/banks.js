// src/api/banks.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export async function getBanks() {
  const res = await fetch(`${API_BASE}/banks`);
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data; // [{id, code, name, country_code}]
}

export async function assignBank({ email, communityId, bankId }) {
  const res = await fetch(`${API_BASE}/demo/assign-bank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      communityId: Number(communityId),
      bankId: Number(bankId),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}