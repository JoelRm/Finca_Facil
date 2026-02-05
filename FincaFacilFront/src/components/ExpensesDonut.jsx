import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ExpensesDonut({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-600">Gastos por tipo</span>
        <span className="h-6 w-6 rounded-full bg-sky-50 text-sky-500 text-xs flex items-center justify-center">
          ✈
        </span>
      </div>

      <div className="flex flex-1 items-center gap-6">
        {/* DONA MÁS GRUESA Y GRANDE */}
        <div className="w-1/2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="type"
                innerRadius={50}   // donut gordito
                outerRadius={115}  // bastante grande
                paddingAngle={3}
                strokeWidth={2}
              >
                {data.map((item) => (
                  <Cell key={item.type} fill={item.color} stroke="#fff" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* LEYENDA CON ICONOS REACT COLOREADOS */}
        <div className="w-1/2 space-y-3">
          {data.map((e) => {
            const Icon = e.icon; // componente de icono (Heroicon)

            return (
              <div
                key={e.type}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center space-x-3">
                  {/* Fondo suave tomando el color del segmento */}
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-md"
                    style={{ backgroundColor: e.color + '20' }} // color + transparencia
                  >
                    {/* Icono del mismo color que la dona */}
                    <Icon
                      className="h-4 w-4"
                      style={{ color: e.color }}
                    />
                  </div>

                  <span className="text-gray-700">{e.type}</span>
                </div>

                <span className="font-medium text-gray-600">
                  {e.value.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
