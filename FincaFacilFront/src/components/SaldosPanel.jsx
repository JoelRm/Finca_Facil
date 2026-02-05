// src/components/SaldosPanel.jsx

export default function SaldosPanel({
  accounts,
  onAddBank,
  onBankClick,
  selectedBank,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* HEADER: título + botón Agregar banco */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600">Saldos</h3>

        <button
          type="button"
          onClick={onAddBank}
          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium 
                     text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100
                     transition"
        >
          <span className="mr-1 text-sm">+</span>
          Agregar banco
        </button>
      </div>

      {/* LISTA DE BANCOS */}
      <div className="space-y-2">
        {accounts.map((acc) => {
          const isSelected = selectedBank === acc.bank;

          return (
            <button
              key={acc.bank}
              type="button"
              onClick={() => onBankClick && onBankClick(acc.bank)}
              className={`w-full flex items-center justify-between text-sm px-2 py-2 rounded-lg 
                          border transition cursor-pointer
                          ${
                            isSelected
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-white border-transparent hover:bg-gray-50'
                          }`}
            >
              <div className="flex items-center space-x-2">
                {/* iconito del banco genérico, se puede cambiar luego */}
                <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xs">
                  ✈
                </div>

                {/* nombre del banco tipo hipervínculo */}
                <span
                  className={`font-medium text-sm ${
                    isSelected ? 'text-purple-700' : 'text-purple-600'
                  } hover:underline`}
                >
                  {acc.bank}
                </span>
              </div>

              <span className="font-semibold text-gray-800">
                {acc.balance}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
