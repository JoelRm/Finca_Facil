// src/components/AssignBankModal.jsx
import { useMemo, useState } from "react";

function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-gray-700 animate-spin" />
    </div>
  );
}

export default function AssignBankModal({
  open,
  onClose,
  banks = [],
  loading = false,        // loading de traer /api/banks
  error = null,
  onSelectBank,
  syncing = false,        // 👈 NUEVO: syncing al hacer POST assign-bank
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return banks;
    return banks.filter((b) =>
      `${b.name} ${b.code}`.toLowerCase().includes(s)
    );
  }, [banks, q]);

  if (!open) return null;

  const showBlocking = loading || syncing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={showBlocking ? undefined : onClose} />

      {/* modal */}
      <div className="relative w-[92vw] max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="text-lg font-semibold">Más entidades y tarjetas</div>
            <div className="text-xs text-gray-500">Entidades en tu país</div>
          </div>

          <button
            onClick={onClose}
            disabled={showBlocking}
            className="h-9 w-9 rounded-full bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 border rounded-full px-4 py-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full outline-none text-sm"
              placeholder="Busca tu entidad"
              disabled={showBlocking}
            />
            <span className="text-gray-400">🔍</span>
          </div>

          {error && (
            <div className="mt-4 text-xs text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-4 max-h-[55vh] overflow-auto divide-y">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBank(b)}
                  disabled={syncing}
                  className="w-full text-left px-2 py-3 hover:bg-gray-50 flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div>
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-gray-500">{b.code}</div>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-500">
                  No se encontraron bancos.
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t text-xs text-gray-500">
          Selecciona un banco para asignarlo a tu comunidad.
        </div>

        {/* ✅ Loading bonito (bloqueante) */}
        {showBlocking && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex items-center justify-center">
            <div className="w-[90%] max-w-sm rounded-xl bg-white shadow-md border p-6 text-center">
              <Spinner />
              <div className="mt-4 font-semibold text-gray-800">
                {syncing
                  ? "Sincronizando usuario con cuenta bancaria..."
                  : "Cargando entidades bancarias..."}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Esto puede tardar unos segundos. No cierres esta ventana.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}