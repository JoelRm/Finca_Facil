import { useMemo } from "react";

const PALETTE = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

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

function getCategory(m) {
  return (
    m?.nombre_categoria ??
    m?.categoria ??
    m?.category ??
    m?.categoria_nombre ??
    m?.categoryName ??
    "Sin categoría"
  );
}

function isIncome(m) {
  const t = String(m?.tipo ?? m?.type ?? m?.movimiento_tipo ?? "").toLowerCase();
  // cubre: "cobros", "ingresos", "income"
  return t.includes("cobro") || t.includes("ingreso") || t.includes("income") || m?.isIncome === true;
}

export default function IncomeByCategoryCard({ items = [], title = "Ingreso por categoría" }) {
  const { rows, total, gradient } = useMemo(() => {
    const map = new Map();

    for (const m of items || []) {
      if (!isIncome(m)) continue;
      const cat = getCategory(m);
      const amt = Math.max(0, getAmount(m));
      if (!amt) continue;
      map.set(cat, (map.get(cat) || 0) + amt);
    }

    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sum = arr.reduce((acc, r) => acc + r.value, 0);

    // Top 6 + "Otros"
    const top = arr.slice(0, 6);
    const rest = arr.slice(6).reduce((acc, r) => acc + r.value, 0);
    const rowsFinal = rest > 0 ? [...top, { name: "Otros", value: rest }] : top;

    // conic-gradient segments
    let current = 0;
    const stops = rowsFinal.map((r, idx) => {
      const pct = sum > 0 ? (r.value / sum) * 100 : 0;
      const start = current;
      const end = current + pct;
      current = end;
      const color = r.name === "Otros" ? "#cbd5e1" : PALETTE[idx % PALETTE.length];
      return `${color} ${start}% ${end}%`;
    });

    const g = sum > 0 ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#e5e7eb 0 100%)";

    return {
      rows: rowsFinal.map((r, idx) => ({
        ...r,
        color: r.name === "Otros" ? "#cbd5e1" : PALETTE[idx % PALETTE.length],
        pct: sum > 0 ? (r.value / sum) * 100 : 0,
      })),
      total: sum,
      gradient: g,
    };
  }, [items]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">Total: {formatCurrencyEUR(total)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5">
        {/* Donut */}
        <div className="relative w-[140px] h-[140px] shrink-0">
          <div
            className="absolute inset-0 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            style={{ background: gradient }}
          />
          <div className="absolute inset-[16px] rounded-full bg-white ring-1 ring-gray-100 shadow-inner" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-gray-500">Ingresos</div>
              <div className="text-sm font-semibold text-gray-900">{total > 0 ? "100%" : "—"}</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="min-w-0 flex-1">
          <div className="space-y-2">
            {rows.length === 0 ? (
              <div className="text-xs text-gray-500">No hay ingresos para mostrar.</div>
            ) : (
              rows.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="truncate text-xs text-gray-700">{r.name}</span>
                  </div>
                  <div className="shrink-0 text-xs text-gray-500">{Math.round(r.pct)}%</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}