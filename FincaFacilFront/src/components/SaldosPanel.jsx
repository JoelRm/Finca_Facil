// src/components/SaldosPanel.jsx
import { ArrowRightCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function SaldosPanel({
  accounts = [],
  selectedBank,
  onBankClick,
  onAddBank,
}) {
  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Saldos</h3>
        </div>
        {onAddBank && (
          <button
            onClick={onAddBank}
            className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar banco
          </button>
        )}
      </div>

      <div className="space-y-2">
        {accounts.map((acc) => {
          const isSelected = selectedBank === acc.bank;
          const value = Number(acc.balance || 0);
          const isNegative = value < 0;

          return (
            <button
              key={acc.id || acc.bank}
              type="button"
              onClick={() => onBankClick && onBankClick(acc.bank)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition
                ${
                  isSelected
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <ArrowRightCircleIcon className="h-4 w-4 text-purple-500" />
                <span
                  className={`font-medium ${
                    isSelected ? 'text-purple-700' : 'text-gray-700'
                  }`}
                >
                  {acc.bank}
                </span>
              </div>
              <span
                className={`font-semibold ${
                  isNegative ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {formatCurrency(value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
