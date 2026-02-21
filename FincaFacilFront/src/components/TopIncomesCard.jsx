import { useMemo } from "react";

function formatCurrencyEUR(value) {
  return Number(value || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAmount(m) {
  return Number(m?.importe ?? m?.amount ?? m?.monto ?? m?.total ?? 0);
}

function getLabel(m) {
  return m?.concepto ?? m?.descripcion ?? m?.description ?? m?.detalle ?? m?.counterparty ?? "Ingreso";
}

function isIncome(m) {
  const t = String(m?.tipo ?? m?.type ?? m?.movimiento_tipo ?? "").toLowerCase();
  return t.includes("cobro") || t.includes("ingreso") || t.includes("income") || m?.isIncome === true;
}

export default function TopIncomesCard({ items = [], title = "Top 5 ingresos" }) {
  const rows = useMemo(() => {
    const incomes = (items || [])
      .filter(isIncome)
      .map((m) => ({
        label: getLabel(m),
        value: Math.max(0, getAmount(m)),
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const max = incomes[0]?.value || 0;

    return incomes.map((r) => ({
      ...r,
      width: max > 0 ? (r.value / max) * 100 : 0,
    }));
  }, [items]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs text-gray-500">Mayores cobros del periodo</p>
      </div>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="text-xs text-gray-500">No hay ingresos para mostrar.</div>
        ) : (
          rows.map((r, idx) => (
            <div key={`${r.label}-${idx}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs text-gray-700">{r.label}</div>
                </div>
                <div className="shrink-0 text-xs font-medium text-gray-900">
                  {formatCurrencyEUR(r.value)}
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${r.width}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}