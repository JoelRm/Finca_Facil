export default function KPICard({ title, value, badge, onSeeMore }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-600">{title}</span>
        {badge && (
          <span
            className="h-6 w-6 rounded-full text-xs flex items-center justify-center"
            style={badge.style}
          >
            {badge.label}
          </span>
        )}
      </div>

      <p className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
        {value}
        <span className="text-lg">€</span>
      </p>

      {onSeeMore && (
        <button
          onClick={onSeeMore}
          className="mt-3 self-start text-xs font-medium text-purple-600 hover:text-purple-700"
        >
          Ver detalle →
        </button>
      )}
    </div>
  );
}
