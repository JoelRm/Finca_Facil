// src/components/DetailDrawer.jsx
export default function DetailDrawer({ open, type, items = [], onClose }) {
  const titles = {
    pagos: 'Detalle de pagos',
    cobros: 'Detalle de cobros',
    saldos: 'Detalle de saldos',
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES');
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* fondo oscuro */}
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
      />

      {/* drawer */}
      <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-[slideIn_0.2s_ease-out_forwards]">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {titles[type] || 'Detalle'}
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-xs">
          {items.length === 0 && (
            <p className="text-gray-400 italic">
              No hay movimientos para mostrar.
            </p>
          )}

          {items.map((mov) => (
            <div
              key={mov.id}
              className="border border-gray-100 rounded-xl px-3 py-2 flex justify-between"
            >
              <div>
                <div className="font-medium text-gray-800 truncate max-w-[220px]">
                  {mov.description}
                </div>
                <div className="text-gray-400">
                  {formatDate(mov.movement_date)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-semibold ${
                    mov.amount < 0 ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  {formatAmount(mov.amount)}
                </div>
                <div className="text-[10px] text-gray-400">
                  Saldo: {formatAmount(mov.balance_after)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* animación tailwind custom */}
      <style>
        {`@keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }`}
      </style>
    </div>
  );
}
