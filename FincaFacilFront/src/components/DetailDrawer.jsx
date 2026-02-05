// src/components/DetailDrawer.jsx
import { XMarkIcon } from '@heroicons/react/24/outline';

const TITLE_MAP = {
  pagos: 'Detalle de pagos',
  cobros: 'Detalle de cobros',
  saldos: 'Detalle de saldos',
};

export default function DetailDrawer({ open, type, onClose, items = [] }) {
  // para no mostrar nada si no hay tipo
  const title = type ? TITLE_MAP[type] : '';

  return (
    <div
      className={`fixed inset-0 z-40 flex ${
        open ? '' : 'pointer-events-none'
      }`}
    >
      {/* Overlay */}
      <div
        className={`flex-1 bg-black/20 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel derecho */}
      <div
        className={`ml-auto h-full w-full max-w-md bg-white shadow-xl border-l transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-sm">
          {items.length === 0 && (
            <p className="text-gray-400">
              Aquí podrás mostrar el detalle real de {type}.
            </p>
          )}

          {items.map((m) => (
            <div
              key={m.id}
              className="border rounded-lg px-3 py-2 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-700">{m.description}</p>
                <p className="text-xs text-gray-400">{m.date}</p>
              </div>
              <p
                className={`font-semibold ${
                  m.amount < 0 ? 'text-red-500' : 'text-emerald-600'
                }`}
              >
                {m.amount.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
