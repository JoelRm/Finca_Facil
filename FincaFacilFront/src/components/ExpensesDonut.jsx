// src/components/ExpensesDonut.jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white shadow-md rounded px-3 py-2 text-xs border border-gray-100">
      <div className="font-semibold text-gray-700 mb-1">
        {item.name}
      </div>
      <div className="text-gray-600">
        {formatCurrency(item.value)}
      </div>
    </div>
  );
}

export default function ExpensesDonut({ data = [], year, bankId }) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Gastos por categoría
          </h3>
          <p className="text-xs text-gray-500">
            Distribución de gastos
          </p>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/2 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="type"
                innerRadius="50%"
                outerRadius="88%"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color || '#6366F1'}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-1/2 pl-3 flex flex-col justify-between">
          <div className="space-y-2 text-xs max-h-44 overflow-y-auto pr-1">
            {data.map((item, idx) => {
              const percent =
                total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color || '#6366F1' }}
                    />
                    <span className="text-gray-700">{item.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900 font-semibold">
                      {formatCurrency(item.value)}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {percent}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón Ver detalle */}
          {year && bankId && (
            <div className="mt-3">
              <Link
                to={`/categorias?year=${year}&bankId=${bankId}`}
                className="inline-flex items-center text-[11px] font-medium text-purple-600 hover:text-purple-800"
              >
                Ver detalle de categorías →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
