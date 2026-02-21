// src/components/KPICard.jsx
export default function KPICard({ title, value, badge, onSeeMore, variant = "default" }) {
  const variants = {
    default: {
      wrap: "bg-white rounded-2xl shadow-sm p-4 flex flex-col justify-between min-h-[140px]",
      header: null,
      title: "text-xs text-gray-500",
      value: "mt-2 text-2xl font-semibold text-gray-900",
      body: "",
    },
    income: {
      wrap: "bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col min-h-[140px]",
      header: "bg-emerald-600",
      title: "text-[11px] font-semibold tracking-wide uppercase text-white",
      value: "text-gray-900 font-semibold tabular-nums select-none",
      body: "p-4 flex-1 flex flex-col justify-between",
    },
    expense: {
      wrap: "bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col min-h-[140px]",
      header: "bg-red-600",
      title: "text-[11px] font-semibold tracking-wide uppercase text-white",
      value: "text-gray-900 font-semibold tabular-nums select-none",
      body: "p-4 flex-1 flex flex-col justify-between",
    },
    profit: {
      wrap: "bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col min-h-[140px]",
      header: "bg-amber-400",
      title: "text-[11px] font-semibold tracking-wide uppercase text-white",
      value: "text-gray-900 font-semibold tabular-nums select-none",
      body: "p-4 flex-1 flex flex-col justify-between",
    },
  };

  const v = variants[variant] || variants.default;

  // modo antiguo (no se rompe)
  if (variant === "default") {
    return (
      <div className={v.wrap}>
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <p className={v.title}>{title}</p>
            <p className={v.value}>{value}</p>
          </div>

          {badge && (
            <span
              className="inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-medium"
              style={badge.style}
            >
              {badge.label}
            </span>
          )}
        </div>

        {onSeeMore && (
          <button
            onClick={onSeeMore}
            className="mt-2 text-[11px] font-medium text-purple-600 hover:text-purple-800 self-start"
          >
            Ver detalle →
          </button>
        )}
      </div>
    );
  }

  // modo KPI con barra superior (mejorado)
  return (
    <div className={v.wrap}>
      <div className={`px-4 py-2 ${v.header}`}>
        <div className="flex items-center justify-between">
          <p className={v.title}>{title}</p>

          {badge && (
            <span className="inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-medium bg-white/20 text-white select-none">
              {badge.label}
            </span>
          )}
        </div>
      </div>

      <div className={v.body}>
        <div className="min-w-0">
          {/* número responsivo + sin overflow */}
          <div className={`text-2xl sm:text-3xl ${v.value} truncate`}>
            {value}
          </div>
        </div>

        {onSeeMore && (
          <button
            onClick={onSeeMore}
            className="mt-3 text-[11px] font-medium text-purple-600 hover:text-purple-800 self-start"
          >
            Ver detalle →
          </button>
        )}
      </div>
    </div>
  );
}