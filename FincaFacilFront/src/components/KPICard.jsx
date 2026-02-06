// src/components/KPICard.jsx
export default function KPICard({ title, value, badge, onSeeMore }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {value}
          </p>
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
