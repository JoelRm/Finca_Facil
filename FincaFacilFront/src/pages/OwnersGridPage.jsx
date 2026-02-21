import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import { getCommunityOwnersMonthly, allocateUnidentifiedPayment } from "../api/ownersMonthly";

import { Home, Settings, ThumbsUp, ThumbsDown, ArrowLeft, X } from "lucide-react";

const MONTHS = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
];

function euro(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
   MODAL ASIGNACIÓN
   ========================= */

function AllocateModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  info,
}) {
  const [delta, setDelta] = useState("");

  useEffect(() => {
    if (open) setDelta("");
  }, [open]);

  if (!open) return null;

  const monthLabel = info?.targetMes ? MONTHS[info.targetMes - 1] : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-indigo-900 uppercase">
              Asignar pago
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Cliente: <span className="font-semibold">{info?.clientName}</span>
              {" · "}
              Propiedad: <span className="font-semibold">{info?.propertyCode}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Mes objetivo: <span className="font-semibold">{monthLabel}</span>
              {" · "}
              Mes origen (no identificado): <span className="font-semibold">{MONTHS[(info?.sourceMes || 1) - 1]}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">
            Monto a asignar
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent"
            placeholder="Ej: 50"
          />

          <div className="mt-2 text-[11px] text-gray-500">
            Esto <b>resta</b> del no identificado del mes origen y <b>suma</b> al pago del cliente en el mes objetivo.
          </div>

          {error && (
            <div className="mt-3 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onSubmit(delta)}
            disabled={loading || !delta || Number(delta) <= 0}
            className="h-9 px-4 rounded-xl bg-indigo-900 text-white text-xs font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Asignando..." : "Asignar"}
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
  const [bankId] = useState(state.bankId ?? null);

  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState(null);
  const [error, setError] = useState(null);

  // modal state
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState(null);
  const [allocInfo, setAllocInfo] = useState(null);

  const months = useMemo(() => {
    const h = Math.max(1, Math.min(12, Number(hastaMes || 12)));
    return MONTHS.slice(0, h);
  }, [hastaMes]);

  const refresh = async () => {
    const data = await getCommunityOwnersMonthly(communityId, selectedYear, hastaMes, bankId);
    setGrid(data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await refresh();
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

  // ✅ layout (sin scroll horizontal)
  const LEFT_COL = "200px";
  const MONTH_COL = "minmax(70px,1fr)";
  const TOTAL_COL = "130px";

  // ✅ al hacer click en una celda (cliente/mes) abrimos el modal
  const openAllocate = (client, targetMes) => {
    setAllocError(null);
    setAllocInfo({
      communityId,
      anio: selectedYear,
      sourceMes: targetMes, // por defecto igual (puedes cambiarlo si luego quieres UI)
      targetMes,
      clientId: Number(client.clientId),
      clientName: client.clientName,
      propertyCode: client.property?.code,
      monthlyFee: Number(client.monthlyFee || 0),
      due: Number(client.months?.[targetMes - 1]?.due || client.monthlyFee || 0),
      paid: Number(client.months?.[targetMes - 1]?.paid || 0),
    });
    setAllocOpen(true);
  };

  const submitAllocate = async (deltaStr) => {
    try {
      setAllocLoading(true);
      setAllocError(null);

      const delta = Number(deltaStr);
      if (!Number.isFinite(delta) || delta <= 0) {
        setAllocError("Ingresa un monto válido");
        return;
      }

      // ✅ Enviamos al backend
      await allocateUnidentifiedPayment({
        communityId: allocInfo.communityId,
        anio: allocInfo.anio,
        sourceMes: allocInfo.sourceMes,
        targetMes: allocInfo.targetMes,
        clientId: allocInfo.clientId,
        delta,
      });

      // ✅ REFRESH obligatorio de la lista
      await refresh();

      setAllocOpen(false);
    } catch (e) {
      console.error(e);
      setAllocError(e?.message || "No se pudo asignar el monto");
    } finally {
      setAllocLoading(false);
    }
  };

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
                  const totalPaid = (c.months || []).reduce((a, x) => a + Number(x.paid || 0), 0);

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
                        const s = statusStyles(m?.status);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openAllocate(c, idx + 1)}
                            className={`rounded-xl ${s.wrap} p-3 flex items-center justify-center hover:opacity-90 transition`}
                            title="Click para asignar desde No Identificado"
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

                {/* SIN IDENTIFICAR (por mes) */}
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

                    {months.map((_, idx) => {
                      const um = unidentified?.months?.[idx];
                      const available = Number(um?.available ?? um?.total ?? 0);
                      const used = Number(um?.used ?? 0);

                      return (
                        <div
                          key={idx}
                          className="rounded-xl bg-gray-100 p-3 flex flex-col items-center justify-center"
                          title="Disponible (resta cuando asignas)"
                        >
                          {available > 0 ? (
                            <Bubble>{euro(available)}</Bubble>
                          ) : (
                            <span className="text-gray-400 text-lg">—</span>
                          )}

                          {used > 0 && (
                            <div className="mt-1 text-[10px] text-gray-500">
                              usado: {euro(used)}
                            </div>
                          )}
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
                  const totalPaid = (c.months || []).reduce((a, x) => a + Number(x.paid || 0), 0);

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
                          const s = statusStyles(m?.status);

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => openAllocate(c, idx + 1)}
                              className={`rounded-xl ${s.wrap} p-3 text-left hover:opacity-90 transition`}
                              title="Tap para asignar desde No Identificado"
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

                {/* SIN IDENTIFICAR (MOBILE) */}
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
                      {months.map((label, idx) => {
                        const um = unidentified?.months?.[idx];
                        const available = Number(um?.available ?? um?.total ?? 0);
                        const used = Number(um?.used ?? 0);

                        return (
                          <div key={idx} className="rounded-xl bg-gray-100 p-3">
                            <div className="text-xs font-bold text-gray-700">{label}</div>
                            <div className="mt-2">
                              {available > 0 ? (
                                <Bubble>{euro(available)}</Bubble>
                              ) : (
                                <span className="text-gray-400 text-lg">—</span>
                              )}
                            </div>

                            {used > 0 && (
                              <div className="mt-1 text-[10px] text-gray-500">
                                usado: {euro(used)}
                              </div>
                            )}
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

          {/* ✅ MODAL */}
          <AllocateModal
            open={allocOpen}
            onClose={() => setAllocOpen(false)}
            onSubmit={submitAllocate}
            loading={allocLoading}
            error={allocError}
            info={allocInfo}
          />
        </main>
      </div>
    </div>
  );
}