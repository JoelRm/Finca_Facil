import { useMemo } from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatCurrencyEUR(value) {
  return Number(value || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatus(score) {
  if (score < 40) {
    return {
      label: "Vas justo",
      pill: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20",
      progress: "#16a34a",
      rest: "#ef4444",
    };
  }
  if (score >= 70) {
    return {
      label: "Vas genial",
      pill: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20",
      progress: "#16a34a",
      rest: "#e5e7eb",
    };
  }
  return {
    label: "Vas bien",
    pill: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20",
    progress: "#16a34a",
    rest: "#e5e7eb",
  };
}

export default function AccountHealthCard({
  ingresos = 0,
  gastos = 0,
  title = "Salud de tu cuenta",
  onAdd,
}) {
  const { neto, score } = useMemo(() => {
    const ing = Number(ingresos || 0);
    const gas = Number(gastos || 0);
    const n = ing - gas;

    const ratio = ing > 0 ? n / ing : 0;
    const s = clamp(ratio * 100, 0, 100);

    return { neto: n, score: s };
  }, [ingresos, gastos]);

  const status = useMemo(() => getStatus(score), [score]);

  const ringStyle = useMemo(() => {
    const deg = `${score * 3.6}deg`;
    return {
      background: `conic-gradient(${status.progress} 0 ${deg}, ${status.rest} ${deg} 360deg)`,
    };
  }, [score, status.progress, status.rest]);

  // Mantén este valor (tu aro está perfecto)
  const RING = 18;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500 truncate">
            Resumen de ingresos y gastos del periodo seleccionado
          </p>
        </div>

        {typeof onAdd === "function" && (
          <button
            type="button"
            onClick={onAdd}
            className="h-10 w-10 shrink-0 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center hover:bg-amber-500/15 active:scale-[0.98] transition
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            title="Añadir"
            aria-label="Añadir"
          >
            <span className="text-xl leading-none">+</span>
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className="relative w-[280px] h-[280px] flex items-center justify-center">
          {/* Ring */}
          <div className="absolute inset-0 rounded-full" style={ringStyle} />

          {/* Blanco */}
          <div
            className="absolute rounded-full bg-white shadow-inner z-10"
            style={{ inset: `${RING}px` }}
          />

          {/* Contenido */}
          <div
            className="absolute rounded-full z-20 overflow-hidden"
            style={{ inset: `${RING}px` }}
          >
            <div className="h-full w-full px-3 py-2 flex flex-col text-center">
              {/* Arriba (shrink-0 para que no lo aplaste nada) */}
              <div className="flex justify-center shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 ring-1 ring-amber-200 flex items-center justify-center">
                  <span className="text-amber-700 text-sm font-semibold leading-none">€</span>
                </div>
              </div>

              {/* Centro (flex-1 => se ajusta al espacio disponible) */}
              <div className="flex-1 flex flex-col items-center justify-center gap-1">
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 tabular-nums leading-tight max-w-[190px] truncate">
                  {formatCurrencyEUR(neto)}
                </div>

                <div className={`px-3 py-0.5 rounded-full text-[11px] font-medium ${status.pill}`}>
                  {status.label}
                </div>

                <div className="text-[10px] text-gray-500 leading-none">
                  Salud: <span className="font-medium text-gray-700">{Math.round(score)}%</span>
                </div>
                    <div className="grid grid-cols-[auto_auto] justify-between items-center gap-x-2 gap-y-1">
                        <div className="min-w-0 inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            <span className="whitespace-nowrap">Ingresos</span>
                        </div>
                        <div className="text-right font-medium tabular-nums whitespace-nowrap">
                            {formatCurrencyEUR(ingresos)}
                        </div>

                        <div className="min-w-0 inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="whitespace-nowrap">Gastos</span>
                        </div>
                        <div className="text-right font-medium tabular-nums whitespace-nowrap">
                            {formatCurrencyEUR(gastos)}
                        </div>
                        </div>
              </div>

              {/* Abajo (shrink-0 => SIEMPRE se ve) */}
            
            </div>
          </div>

          {/* brillo */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}