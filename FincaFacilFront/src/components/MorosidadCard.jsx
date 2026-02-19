// src/components/MorosidadCard.jsx
import React, { useMemo } from "react";

export default function MorosidadCard({
  percent = 0,                 // 0..100
  onAdd = () => {},
  title = "Morosidad",
  subtitle = "Cobrado\nde las cuotas",
}) {
  const raw = typeof percent === "string" ? parseFloat(percent) : percent;
  const p = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;

  const angleRad = useMemo(() => {
    const deg = -180 + (p * 180) / 100;
    return (deg * Math.PI) / 180;
  }, [p]);

  const cx = 110, cy = 110;
  const needleLen = 78;
  const nx = cx + Math.cos(angleRad) * needleLen;
  const ny = cy + Math.sin(angleRad) * needleLen;

  const r = 90;
  const halfCirc = Math.PI * r;
  const progress = (p / 100) * halfCirc;
  const rest = halfCirc - progress;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>

        <button
          onClick={onAdd}
          className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border border-orange-200 hover:bg-orange-200 transition"
          aria-label="Agregar"
          title="Agregar"
        >
          +
        </button>
      </div>

      <div className="mt-2 flex items-end gap-4">
        <div className="relative w-[220px] h-[120px]">
          <div className="absolute inset-0 overflow-hidden">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="rgb(209 213 219)"
                strokeWidth="18"
                strokeLinecap="round"
              />

              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="rgb(21 128 61)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${rest}`}
              />

              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke="rgb(55 65 81)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              <circle cx={cx} cy={cy} r="22" fill="rgb(251 146 60)" />
              <circle cx={cx} cy={cy} r="12" fill="rgb(255 237 213)" />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-5xl font-extrabold text-gray-900 leading-none">
            {Math.round(p)}%
          </div>
          <div className="text-sm text-gray-600 whitespace-pre-line mt-2">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
