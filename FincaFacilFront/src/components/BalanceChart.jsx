// src/components/BalanceChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from 'recharts';

const formatCurrencyShort = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  if (value <= -1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value <= -1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value;
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const ingresos = payload.find(p => p.dataKey === 'ingresos');
  const gastos = payload.find(p => p.dataKey === 'gastos');
  const saldo = payload.find(p => p.dataKey === 'saldo');

  const fmt = (v) =>
    v.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    });

  return (
    <div className="bg-white shadow-md rounded px-3 py-2 text-xs border border-gray-100">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      {ingresos && (
        <div className="text-emerald-600">
          Ingresos: {fmt(ingresos.value || 0)}
        </div>
      )}
      {gastos && (
        <div className="text-rose-500">
          Gastos: {fmt(gastos.value || 0)}
        </div>
      )}
      {saldo && (
        <div className="text-indigo-600">
          Saldo: {fmt(saldo.value || 0)}
        </div>
      )}
    </div>
  );
}

export default function BalanceChart({ data = [], subtitle }) {
  // calcular máximo para que el eje Y sea razonable y las barras se vean
  const maxValue = data.reduce(
    (max, d) =>
      Math.max(
        max,
        d.ingresos || 0,
        d.gastos || 0,
        d.saldo != null ? d.saldo : 0
      ),
    0
  );

  const yMax = maxValue > 0 ? maxValue * 1.2 : 10000; // 20% de margen

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Ingresos y gastos
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            barSize={18}        // barras más gruesas
            barGap={6}          // espacio entre ingresos y gastos
            barCategoryGap={24} // espacio entre meses
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              tickMargin={8}
              axisLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tickFormatter={formatCurrencyShort}
              tick={{ fontSize: 10 }}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={24}
              iconSize={8}
            />

            {/* Barras lado a lado, con colores específicos */}
            <Bar
              dataKey="ingresos"
              name="Ingresos"
              fill="#22C55E"
              radius={[4, 4, 0, 0]}
              z={5}                // 👈 z bajo
            />

            <Bar
              dataKey="gastos"
              name="Gastos"
              fill="#FB7185"
              radius={[4, 4, 0, 0]}
              z={5}                // 👈 z bajo
            />

            {/* Línea de saldo SIEMPRE por encima */}
            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="#6366F1"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 4 }}
              z={20}               // 👈 z alto, va sobre las barras
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
