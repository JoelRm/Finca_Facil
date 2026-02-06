// src/components/BankMovementsTable.jsx
import { Link } from 'react-router-dom';

// Si ya la tienes en un utils, borra esto y haz import:
// import { categoryVisual } from '../utils/categoryVisual';
const categoryVisual = (name) => {
  const raw = (name || "").toLowerCase();
  let emoji = "💸";
  let color = "bg-gray-100 text-gray-700";
  let chartColor = "#6B7280";

  if (raw.includes("luz")) {
    emoji = "💡";
    color = "bg-amber-100 text-amber-700";
    chartColor = "#FBBF24";
  } else if (raw.includes("agua")) {
    emoji = "💧";
    color = "bg-sky-100 text-sky-700";
    chartColor = "#0EA5E9";
  } else if (raw.includes("seguro")) {
    emoji = "🛡️";
    color = "bg-emerald-100 text-emerald-700";
    chartColor = "#10B981";
  } else if (raw.includes("mantenimiento")) {
    emoji = "🛠️";
    color = "bg-indigo-100 text-indigo-700";
    chartColor = "#6366F1";
  } else if (raw.includes("nómina")) {
    emoji = "👤";
    color = "bg-purple-100 text-purple-700";
    chartColor = "#A855F7";
  } else if (raw.includes("alquiler")) {
    emoji = "🏠";
    color = "bg-pink-100 text-pink-700";
    chartColor = "#EC4899";
  }

  return { emoji, color, chartColor };
};

export default function BankMovementsTable({
  items = [],
  bankName,
  bankId,
  year,
  showSeeMore = true,   // Dashboard: true, Movimientos: false
  variant = 'compact',  // 'compact' (dashboard) | 'detailed' (movimientos)
}) {
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES') : '';

  const formatAmount = (v) =>
    Number(v || 0).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR', // cambia a 'PEN' si quieres
    });

  const renderCompactRows = () => (
    <div className="divide-y divide-gray-100 text-xs">
      {(!items || items.length === 0) && (
        <p className="text-gray-400 italic py-2">
          No hay movimientos recientes.
        </p>
      )}

      {items &&
        items.map((mov) => {
          const isNegative = mov.amount < 0;

          return (
            <div
              key={mov.id}
              className="flex items-center justify-between py-2"
            >
              <div>
                <div className="font-medium text-gray-800">
                  {mov.description}
                </div>
                <div className="text-[11px] text-gray-400">
                  {formatDate(mov.movement_date)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-semibold ${
                    isNegative ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  {formatAmount(mov.amount)}
                </div>
                <div className="text-[10px] text-gray-400">
                  Saldo: {formatAmount(mov.balance_after)}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );

  const renderDetailedTable = () => (
    <div className="overflow-x-auto text-xs">
      {(!items || items.length === 0) ? (
        <p className="text-gray-400 italic py-2">
          No hay movimientos para mostrar.
        </p>
      ) : (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-[11px] text-gray-500 uppercase border-b border-gray-100">
              <th className="py-2 pr-2 text-left">Fecha</th>
              <th className="py-2 px-2 text-left">Descripción</th>
              <th className="py-2 px-2 text-left">Ref 1</th>
              <th className="py-2 px-2 text-left">Ref 2</th>
              <th className="py-2 px-2 text-left">Categoría</th>
              <th className="py-2 px-2 text-right">Monto</th>
              <th className="py-2 pl-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((mov) => {
              const isNegative = mov.amount < 0;

              const date =
                mov.movement_date ||
                mov.transaction_date ||
                mov.fecha ||
                mov.fecha_transaccion;

              const ref1 =
                mov.reference1 ||
                mov.referencia1 ||
                mov.ref1 ||
                mov.referencia_1;

              const ref2 =
                mov.reference2 ||
                mov.referencia2 ||
                mov.ref2 ||
                mov.referencia_2;

              const description =
                mov.description ||
                mov.descripcion ||
                mov.detalle ||
                mov.concepto;

              const categoryName =
                mov.category_name ||
                mov.categoryName ||
                mov.category ||
                mov.categoria ||
                mov.categoria_nombre;

              const { emoji, color } = categoryVisual(categoryName);

              return (
                <tr
                  key={mov.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="py-1.5 pr-2 align-top text-gray-700 whitespace-nowrap">
                    {formatDate(date)}
                  </td>

                  {/* Nueva columna: Descripción */}
                  <td className="py-1.5 px-2 align-top text-gray-700 max-w-[220px]">
                    <div className="truncate" title={description || ''}>
                      {description || '—'}
                    </div>
                  </td>

                  <td className="py-1.5 px-2 align-top text-gray-700 max-w-[140px] truncate">
                    {ref1 || '—'}
                  </td>
                  <td className="py-1.5 px-2 align-top text-gray-700 max-w-[140px] truncate">
                    {ref2 || '—'}
                  </td>
                  <td className="py-1.5 px-2 align-top">
                    {categoryName ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}
                      >
                        <span>{emoji}</span>
                        <span className="truncate max-w-[120px]">
                          {categoryName}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">
                        Sin categoría
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 align-top text-right font-semibold whitespace-nowrap">
                    <span
                      className={
                        isNegative ? 'text-red-600' : 'text-emerald-700'
                      }
                    >
                      {formatAmount(mov.amount)}
                    </span>
                  </td>
                  <td className="py-1.5 pl-2 align-top text-right text-gray-700 whitespace-nowrap">
                    {formatAmount(mov.balance_after)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {variant === 'detailed' ? 'Movimientos' : 'Últimos movimientos'}
          </h3>
          <p className="text-xs text-gray-500">
            {bankName ? `Cuenta: ${bankName}` : 'Selecciona un banco'}
          </p>
        </div>

        {bankId && year && (
          showSeeMore ? (
            // 🔹 Modo Dashboard → Ver más
            <Link
              to={`/movimientos?bankId=${bankId}&year=${year}`}
              className="text-xs font-medium text-purple-600 hover:text-purple-800"
            >
              Ver más →
            </Link>
          ) : (
            // 🔹 Modo Movimientos → Regresar al dashboard
            <Link
              to="/"
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              ⟵ Regresar al dashboard
            </Link>
          )
        )}
      </div>

      {variant === 'detailed' ? renderDetailedTable() : renderCompactRows()}
    </div>
  );
}
