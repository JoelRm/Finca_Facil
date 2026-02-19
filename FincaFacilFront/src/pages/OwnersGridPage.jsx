import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";

import { getCommunityOwnersMonthly } from "../api/ownersMonthly";

import { Home, Settings, ThumbsUp, ThumbsDown, ArrowLeft } from "lucide-react";

const MONTHS = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
];

function euro(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
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

  const months = useMemo(() => {
    const h = Math.max(1, Math.min(12, Number(hastaMes || 12)));
    return MONTHS.slice(0, h);
  }, [hastaMes]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCommunityOwnersMonthly(
          communityId,
          selectedYear,
          hastaMes,
          bankId
        );
        setGrid(data);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Error cargando grilla");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [communityId, selectedYear, hastaMes, bankId]);

  const clients = grid?.clients || [];
  const unidentified = grid?.unidentified || null;

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

                      {/* MONTHS */}
                      {months.map((_, idx) => {
                        const m = c.months?.[idx];
                        const paid = Number(m?.paid || 0);
                        const s = statusStyles(m?.status);

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl ${s.wrap} p-3 flex items-center justify-center`}
                          >
                            {paid > 0 ? (
                              <Bubble>{euro(paid)}</Bubble>
                            ) : (
                              <span className="text-gray-400 text-lg">—</span>
                            )}
                          </div>
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

                    {months.map((_, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-gray-100 p-3 flex items-center justify-center"
                      >
                        —
                      </div>
                    ))}

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
                          const s = statusStyles(m?.status);

                          return (
                            <div key={idx} className={`rounded-xl ${s.wrap} p-3`}>
                              <div className="text-xs font-bold text-gray-700">{label}</div>
                              <div className="mt-2">
                                {paid > 0 ? (
                                  <Bubble>{euro(paid)}</Bubble>
                                ) : (
                                  <span className="text-gray-400 text-lg">—</span>
                                )}
                              </div>
                            </div>
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
                      {months.map((label, idx) => (
                        <div key={idx} className="rounded-xl bg-gray-100 p-3">
                          <div className="text-xs font-bold text-gray-700">{label}</div>
                          <div className="mt-2 text-gray-400 text-lg">—</div>
                        </div>
                      ))}
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
        </main>
      </div>
    </div>
  );
}
