import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function BalanceChart({ data, subtitle }) {
  // Calculamos el valor máximo entre ingresos, gastos y saldo
  const { yDomain, yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { yDomain: [0, 10000], yTicks: [0, 5000, 10000] };
    }

    let maxValue = 0;
    data.forEach((d) => {
      ['ingresos', 'gastos', 'saldo'].forEach((key) => {
        if (typeof d[key] === 'number' && d[key] > maxValue) {
          maxValue = d[key];
        }
      });
    });

    // Redondear hacia arriba al múltiplo de 5000
    const upper = Math.max(10000, Math.ceil(maxValue / 5000) * 5000);

    const ticks = [];
    for (let t = 0; t <= upper; t += 5000) {
      ticks.push(t);
    }

    return { yDomain: [0, upper], yTicks: ticks };
  }, [data]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700">Ingresos y Gastos</h2>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            // separa más las barras entre categorías
            barCategoryGap={40}
            barGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />

            {/* EJE Y EN K (5K, 10K, 15K, ...) */}
            <YAxis
              domain={yDomain}
              ticks={yTicks}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value / 1000}K`}
            />

            <Tooltip
              formatter={(value) =>
                value.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) + ' €'
              }
            />

            {/* Barras más delgadas */}
            <Bar
              dataKey="ingresos"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
            <Bar
              dataKey="gastos"
              fill="#FB7185"
              radius={[4, 4, 0, 0]}
              barSize={30}
            />

            <Line
              type="monotone"
              dataKey="saldo"
              stroke="#4F46E5"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
