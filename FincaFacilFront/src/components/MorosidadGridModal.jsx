// src/pages/OwnersGridPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import { getCommunityOwnersMonthly } from "../api/ownersMonthly";

import { Home, Settings, ThumbsUp, ThumbsDown, ArrowLeft, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const MONTHS = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
];

function euro(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function statusStyles(status) {
  if (status === "ok") return { wrap: "bg-green-50" };
  if (status === "less") return { wrap: "bg-red-50" };
  if (status === "more") return { wrap: "bg-yellow-50" };
  return { wrap: "bg-gray-50" };
}

/* =========================
   UI COMPONENTS
   ========================= */

function CircleIconButton({ onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className="h-10 w-10 rounded-full bg-indigo-900 text-white flex items-center justify-center shadow-sm hover:opacity-90"
    >
      {children}
    </button>
  );
}

function Bubble({ children }) {
  return (
    <div className="relative inline-flex items-center justify-center bg-indigo-900 text-white font-bold rounded-lg px-2 py-1 text-sm">
      {children}
      <span
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0
          border-t-[6px] border-t-transparent
          border-b-[6px] border-b-transparent
          border-r-[6px] border-r-indigo-900"
      />
    </div>
  );
}

function TotalThumb({ type = "up", amount }) {
  const Icon = type === "down" ? ThumbsDown : ThumbsUp;
  const tone =
    type === "down"
      ? "text-red-600 bg-red-50 border-red-200"
      : "text-green-700 bg-green-50 border-green-200";

  return (
    <div className={`rounded-2xl border p-3 flex flex-col items-center justify-center ${tone}`}>
      <Icon size={34} className="opacity-70" />
      <div className="font-bold text-base mt-1">{amount}</div>
    </div>
  );
}

/* =========================
   API: Allocate
   ========================= */
async function postAllocateUnidentified({ communityId, anio, sourceMes, targetMes, clientId, delta }) {
  const r = await fetch(`${API_BASE}/api/payments/unidentified/allocate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      communityId: Number(communityId),
      anio: Number(anio),
      sourceMes: Number(sourceMes),
      targetMes: Number(targetMes),
      clientId: Number(clientId),
      delta: Number(delta),
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
  }
  return data;
}

/* =========================
   MODAL Allocate
   ========================= */
function AllocateModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  clientName,
  propertyCode,
  targetMes,
  monthsOptions,
  selectedSourceMes,
  setSelectedSourceMes,
  maxAvailable,
  delta,
  setDelta,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={loading ? undefined : onClose} />

      {/* card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-lg p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-indigo-900 uppercase">
              Asignar desde No Identificado
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {clientName} · {propertyCode} · Mes destino: <b>{MONTHS[targetMes - 1]}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={loading ? undefined : onClose}
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Mes origen (No Identificado)
            </label>
            <select
              value={selectedSourceMes}
              onChange={(e) => setSelectedSourceMes(Number(e.target.value))}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              disabled={loading}
            >
              {monthsOptions.map((opt) => (
                <option key={opt.mes} value={opt.mes}>
                  {MONTHS[opt.mes - 1]} — disponible: {euro(opt.available)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Monto a asignar (EUROS)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Ej: 50"
              disabled={loading}
            />
            <div className="text-[11px] text-gray-500 mt-1">
              Máximo disponible del mes origen: <b>{euro(maxAvailable)}</b>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={loading ? undefined : onClose}
            className="h-10 px-4 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 disabled:opacity-60"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="h-10 px-4 rounded-xl bg-indigo-900 text-white text-sm font-bold hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Asignar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PAGE
   ========================= */

export default function OwnersGridPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const [communityId] = useState(state.communityId ?? 7);
  const [selectedYear] = useState(state.anio ?? 2025);
  const [hastaMes] = useState(state.hastaMes ?? 12);
  const [bankId] = useState(state.bankId ?? null); // si no lo usas, igual no rompe

  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState(null);
  const [error, setError] = useState(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [activeClient, setActiveClient] = useState(null); // client row
  const [activeTargetMes, setActiveTargetMes] = useState(1);
  const [sourceMes, setSourceMes] = useState(1);
  const [delta, setDelta] = useState("");

  const months = useMemo(() => {
    const h = Math.max(1, Math.min(12, Number(hastaMes || 12)));
    return MONTHS.slice(0, h);
  }, [hastaMes]);

  const refreshGrid = async () => {
    const data = await getCommunityOwnersMonthly(
      communityId,
      selectedYear,
      hastaMes,
      bankId
    );
    setGrid(data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshGrid();
      } catch (e) {
        console.error(e);
        setError(e?.message || "Error cargando grilla");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, selectedYear, hastaMes, bankId]);

  const clients = grid?.clients || [];
  const unidentified = grid?.unidentified || null;

  // ✅ opciones meses origen con available
  const monthsOptions = useMemo(() => {
    const arr = (unidentified?.months || []).map((m) => ({
      mes: Number(m.mes),
      total: Number(m.total || 0),
      used: Number(m.used || 0),
      available: Number(m.available ?? (Number(m.total || 0) - Number(m.used || 0))),
    }));
    // si no hay available por back, lo calculamos
    return arr.length
      ? arr
      : Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0, used: 0, available: 0 }));
  }, [unidentified]);

  const maxAvailable = useMemo(() => {
    const found = monthsOptions.find((x) => Number(x.mes) === Number(sourceMes));
    return Number(found?.available || 0);
  }, [monthsOptions, sourceMes]);

  // ✅ abrir modal SOLO si mes no está pagado exacto
  const openAllocate = (clientRow, targetMes) => {
    const m = clientRow?.months?.[targetMes - 1];
    const paid = Number(m?.paid || 0);
    const due = Number(m?.due || clientRow?.monthlyFee || 0);
    const status = m?.status;

    const isExactPaid = status === "ok" && Math.abs(paid - due) < 0.01;
    if (isExactPaid) return; // 👈 BLOQUEO: no abre modal

    setModalError(null);
    setActiveClient(clientRow);
    setActiveTargetMes(Number(targetMes));

    // por defecto el origen = mismo mes
    setSourceMes(Number(targetMes));
    setDelta("");

    setModalOpen(true);
  };

  const closeModal = () => {
    if (modalLoading) return;
    setModalOpen(false);
    setActiveClient(null);
    setModalError(null);
    setDelta("");
  };

  const submitAllocate = async () => {
    try {
      setModalLoading(true);
      setModalError(null);

      const d = Number(delta);
      if (!Number.isFinite(d) || d <= 0) {
        throw new Error("Ingresa un monto válido (> 0)");
      }
      if (d > maxAvailable + 1e-9) {
        throw new Error(`Monto excede disponible. Disponible: ${euro(maxAvailable)}`);
      }

      if (!activeClient?.clientId) {
        throw new Error("Cliente inválido");
      }

      await postAllocateUnidentified({
        communityId,
        anio: selectedYear,
        sourceMes,
        targetMes: activeTargetMes,
        clientId: Number(activeClient.clientId),
        delta: d,
      });

      // ✅ refresca grilla después de asignar
      await refreshGrid();

      // cierra modal
      setModalOpen(false);
      setActiveClient(null);
      setDelta("");
    } catch (e) {
      setModalError(e?.message || "Error asignando monto");
    } finally {
      setModalLoading(false);
    }
  };

  // ✅ layout (sin scroll horizontal)
  const LEFT_COL = "200px";
  const MONTH_COL = "minmax(70px,1fr)";
  const TOTAL_COL = "130px";

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* ✅ BOTÓN VOLVER */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200"
            >
              <ArrowLeft size={18} />
              Volver
            </button>
          </div>

          {/* HEADER SUPERIOR */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Icono decorativo (NO navega) */}
              <div className="h-12 w-12 rounded-full bg-indigo-900 flex items-center justify-center text-white">
                <Home size={24} />
              </div>

              <div>
                <div className="text-sm font-bold text-indigo-900 uppercase">
                  INGRESOS POR MESES Y
                </div>
                <div className="text-2xl font-black text-indigo-900 uppercase">
                  PROPIETARIO / PROPIEDADES
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-700 px-6 py-3 text-white font-bold text-sm text-center">
                TOTAL<br />EJERCICIO
              </div>

              <CircleIconButton onClick={() => {}} title="Configurar cuotas">
                <Settings size={20} />
              </CircleIconButton>
            </div>
          </div>

          {loading && <div className="text-gray-500 font-semibold mt-6">Cargando...</div>}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">
              {error}
            </div>
          )}

          {/* GRID DESKTOP */}
          {!loading && (
            <div className="hidden lg:block">
              {/* header meses */}
              <div
                className="grid gap-3 mb-4"
                style={{
                  gridTemplateColumns: `${LEFT_COL} repeat(${months.length}, ${MONTH_COL}) ${TOTAL_COL}`,
                }}
              >
                <div />

                {months.map((m) => (
                  <div
                    key={m}
                    className="h-14 rounded-xl bg-amber-300 flex items-center justify-center text-xs font-bold text-indigo-900 text-center px-1"
                  >
                    {m}
                  </div>
                ))}

                <div />
              </div>

              {/* filas */}
              <div className="grid gap-4">
                {clients.map((c) => {
                  const totalPaid = (c.months || []).reduce(
                    (a, x) => a + Number(x.paid || 0),
                    0
                  );

                  return (
                    <div
                      key={`${c.clientId}-${c.property?.id ?? ""}`}
                      className="grid gap-3"
                      style={{
                        gridTemplateColumns: `${LEFT_COL} repeat(${months.length}, ${MONTH_COL}) ${TOTAL_COL}`,
                      }}
                    >
                      {/* OWNER */}
                      <div className="rounded-xl bg-indigo-950 text-white p-3">
                        <div className="font-bold text-base leading-tight line-clamp-2">
                          {c.clientName}
                        </div>
                        <div className="text-xs opacity-80 mt-1 line-clamp-1">
                          {c.property?.code} · cuota {euro(c.monthlyFee)}
                        </div>
                      </div>

                      {/* MONTHS (click para asignar) */}
                      {months.map((_, idx) => {
                        const m = c.months?.[idx];
                        const paid = Number(m?.paid || 0);
                        const due = Number(m?.due || c.monthlyFee || 0);
                        const status = m?.status;

                        const s = statusStyles(status);

                        // ✅ BLOQUEO: si está pagado exacto, no permitir aumentar (no abre modal)
                        const isExactPaid = status === "ok" && Math.abs(paid - due) < 0.01;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isExactPaid) return;
                              openAllocate(c, idx + 1);
                            }}
                            disabled={isExactPaid}
                            className={[
                              `rounded-xl ${s.wrap} p-3 flex items-center justify-center transition`,
                              isExactPaid
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:opacity-90 cursor-pointer",
                            ].join(" ")}
                            title={
                              isExactPaid
                                ? "Este mes ya está pagado exacto. No puedes agregar más."
                                : "Click para asignar desde No Identificado"
                            }
                          >
                            {paid > 0 ? (
                              <Bubble>{euro(paid)}</Bubble>
                            ) : (
                              <span className="text-gray-400 text-lg">—</span>
                            )}
                          </button>
                        );
                      })}

                      <TotalThumb type="up" amount={euro(totalPaid)} />
                    </div>
                  );
                })}

                {/* SIN IDENTIFICAR */}
                {unidentified && (
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: `${LEFT_COL} repeat(${months.length}, ${MONTH_COL}) ${TOTAL_COL}`,
                    }}
                  >
                    <div className="rounded-xl bg-red-600 text-white p-3">
                      <div className="font-bold text-base leading-tight line-clamp-2">
                        INGRESOS SIN IDENTIFICAR
                      </div>
                      <div className="text-xs opacity-80 mt-1">
                        Total: {euro(unidentified.total)}
                      </div>
                    </div>

                    {(unidentified.months || []).slice(0, months.length).map((m, idx) => {
                      const available = Number(m.available ?? (Number(m.total || 0) - Number(m.used || 0)));
                      return (
                        <div
                          key={idx}
                          className="rounded-xl bg-gray-100 p-3 flex items-center justify-center"
                          title={`Disponible: ${euro(available)} (total ${euro(m.total)} - usado ${euro(m.used)})`}
                        >
                          {available > 0 ? <Bubble>{euro(available)}</Bubble> : <span className="text-gray-400 text-lg">—</span>}
                        </div>
                      );
                    })}

                    <TotalThumb type="down" amount={euro(unidentified.total)} />
                  </div>
                )}

                {clients.length === 0 && !unidentified && (
                  <div className="text-center text-gray-500 py-10">
                    No hay datos para mostrar.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ RESPONSIVE (mobile/tablet) */}
          {!loading && (
            <div className="lg:hidden">
              <div className="grid gap-4">
                {clients.map((c) => {
                  const totalPaid = (c.months || []).reduce(
                    (a, x) => a + Number(x.paid || 0),
                    0
                  );

                  return (
                    <div
                      key={`${c.clientId}-${c.property?.id ?? ""}`}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="rounded-xl bg-indigo-950 text-white p-3">
                        <div className="font-bold text-base leading-tight line-clamp-2">
                          {c.clientName}
                        </div>
                        <div className="text-xs opacity-80 mt-1 line-clamp-1">
                          {c.property?.code} · cuota {euro(c.monthlyFee)}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {months.map((label, idx) => {
                          const m = c.months?.[idx];
                          const paid = Number(m?.paid || 0);
                          const due = Number(m?.due || c.monthlyFee || 0);
                          const status = m?.status;

                          const s = statusStyles(status);
                          const isExactPaid = status === "ok" && Math.abs(paid - due) < 0.01;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isExactPaid) return;
                                openAllocate(c, idx + 1);
                              }}
                              disabled={isExactPaid}
                              className={[
                                `rounded-xl ${s.wrap} p-3 text-left transition`,
                                isExactPaid
                                  ? "opacity-60 cursor-not-allowed"
                                  : "hover:opacity-90 cursor-pointer",
                              ].join(" ")}
                              title={
                                isExactPaid
                                  ? "Este mes ya está pagado exacto. No puedes agregar más."
                                  : "Tap para asignar desde No Identificado"
                              }
                            >
                              <div className="text-xs font-bold text-gray-700">{label}</div>
                              <div className="mt-2">
                                {paid > 0 ? (
                                  <Bubble>{euro(paid)}</Bubble>
                                ) : (
                                  <span className="text-gray-400 text-lg">—</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4">
                        <TotalThumb type="up" amount={euro(totalPaid)} />
                      </div>
                    </div>
                  );
                })}

                {unidentified && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="rounded-xl bg-red-600 text-white p-3">
                      <div className="font-bold text-base leading-tight line-clamp-2">
                        INGRESOS SIN IDENTIFICAR
                      </div>
                      <div className="text-xs opacity-80 mt-1">
                        Total: {euro(unidentified.total)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(unidentified.months || []).slice(0, months.length).map((m, idx) => {
                        const available = Number(m.available ?? (Number(m.total || 0) - Number(m.used || 0)));
                        return (
                          <div key={idx} className="rounded-xl bg-gray-100 p-3">
                            <div className="text-xs font-bold text-gray-700">{MONTHS[idx]}</div>
                            <div className="mt-2">
                              {available > 0 ? (
                                <Bubble>{euro(available)}</Bubble>
                              ) : (
                                <span className="text-gray-400 text-lg">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <TotalThumb type="down" amount={euro(unidentified.total)} />
                    </div>
                  </div>
                )}

                {clients.length === 0 && !unidentified && (
                  <div className="text-center text-gray-500 py-10">
                    No hay datos para mostrar.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODAL */}
          <AllocateModal
            open={modalOpen}
            onClose={closeModal}
            onSubmit={submitAllocate}
            loading={modalLoading}
            error={modalError}
            clientName={activeClient?.clientName || ""}
            propertyCode={activeClient?.property?.code || ""}
            targetMes={activeTargetMes}
            monthsOptions={monthsOptions.slice(0, 12)}
            selectedSourceMes={sourceMes}
            setSelectedSourceMes={setSourceMes}
            maxAvailable={maxAvailable}
            delta={delta}
            setDelta={setDelta}
          />
        </main>
      </div>
    </div>
  );
}