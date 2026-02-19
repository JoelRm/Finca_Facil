import React, { useMemo } from "react";

const MONTHS = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
];

function euro(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function statusClass(status) {
  if (status === "ok")   return "bg-green-100 text-green-700 border-green-200";
  if (status === "less") return "bg-red-100 text-red-700 border-red-200";
  if (status === "more") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-50 text-gray-400 border-gray-200";
}

export default function MorosidadGridModal({
  open,
  onClose,
  data,
  loading = false,
  error = null,
}) {
  const months = useMemo(() => {
    const hasta = Math.max(1, Math.min(12, Number(data?.hastaMes || 12)));
    return MONTHS.slice(0, hasta);
  }, [data?.hastaMes]);

  if (!open) return null;

  const clients = data?.clients || [];
  const unidentified = data?.unidentified || null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                INGRESOS POR MESES Y PROPIETARIO/PROPIEDADES
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Año {data?.anio ?? "-"} · Comunidad {data?.communityId ?? "-"} · bancos: {data?.usedBankIds?.join(", ") || "-"}
              </div>
            </div>

            <button
              className="h-9 w-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="px-5 py-3 flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" /> Coincide con su cuota
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" /> Paga de menos
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-400" /> Paga de más
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gray-300" /> Sin pago / sin identificar
            </span>
          </div>

          <div className="px-5 pb-5">
            {loading && (
              <div className="text-xs text-gray-500 py-4">Cargando grilla…</div>
            )}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-3">
                {String(error)}
              </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b">
                      <th className="text-left px-3 py-3 w-[240px] bg-white">
                        Propietario / Propiedad
                      </th>
                      {months.map((m) => (
                        <th key={m} className="text-center px-3 py-3 whitespace-nowrap bg-white">
                          {m}
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 bg-white">TOTAL</th>
                    </tr>
                  </thead>

                  <tbody>
                    {clients.map((c) => {
                      const totalPaid = (c.months || []).reduce((a, x) => a + Number(x.paid || 0), 0);

                      return (
                        <tr key={`${c.clientId}-${c.property?.id}`} className="border-b last:border-b-0">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-800">{c.clientName}</div>
                            <div className="text-xs text-gray-500">
                              {c.property?.code} · cuota {euro(c.monthlyFee)}
                            </div>
                          </td>

                          {months.map((_, idx) => {
                            const m = c.months?.[idx];
                            const paid = Number(m?.paid || 0);

                            const cls = statusClass(m?.status);

                            return (
                              <td key={idx} className="px-2 py-2">
                                <div className={`border rounded-lg px-2 py-2 text-center ${cls}`}>
                                  <div className="font-semibold">
                                    {paid > 0 ? euro(paid) : "—"}
                                  </div>
                                  {!!(m?.paymentDates?.length) && (
                                    <div className="text-[10px] mt-1 text-gray-500">
                                      {m.paymentDates.length} pago(s)
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          <td className="px-3 py-3 text-center font-semibold">
                            {euro(totalPaid)}
                          </td>
                        </tr>
                      );
                    })}

                    {unidentified && (
                      <tr className="bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-800">
                            {unidentified.label || "INGRESOS SIN IDENTIFICAR"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total: {euro(unidentified.total)}
                          </div>
                        </td>

                        {months.map((_, idx) => {
                          const monthNo = idx + 1;
                          const row = (unidentified.months || []).find(x => Number(x.mes) === monthNo);
                          const val = Number(row?.total || 0);

                          return (
                            <td key={idx} className="px-2 py-2">
                              <div className="border rounded-lg px-2 py-2 text-center bg-white text-gray-700 border-gray-200">
                                <div className="font-semibold">
                                  {val > 0 ? euro(val) : "—"}
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        <td className="px-3 py-3 text-center font-semibold">
                          {euro(unidentified.total)}
                        </td>
                      </tr>
                    )}

                    {!loading && clients.length === 0 && (
                      <tr>
                        <td colSpan={months.length + 2} className="px-3 py-6 text-center text-gray-500">
                          No hay datos para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
