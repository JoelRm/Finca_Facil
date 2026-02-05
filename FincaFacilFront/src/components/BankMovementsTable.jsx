import { ArrowDownCircleIcon, ArrowUpCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function BankMovementsTable({ items = [], bankName }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Últimos movimientos — {bankName}
        </h3>

        <Link
          to={`/banco/${encodeURIComponent(bankName)}`}
          className="text-xs font-medium text-purple-600 hover:text-purple-700"
        >
          Ver más →
        </Link>
      </div>

      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="text-gray-400 border-b">
            <th className="py-2 text-left">Fecha</th>
            <th className="py-2 text-left">Descripcion</th>
            <th className="py-2 text-left">Tipo</th>
            <th className="py-2 text-right">Monto</th>
          </tr>
        </thead>

        <tbody>
          {items.map((m) => {
            const Icon = m.amount >= 0 ? ArrowUpCircleIcon : ArrowDownCircleIcon;
            const iconColor = m.amount >= 0 ? 'text-emerald-500' : 'text-rose-500';

            return (
              <tr
                key={m.id}
                className="border-b last:border-b-0 hover:bg-purple-50/40 transition"
              >
                <td className="py-2">{m.date}</td>

                <td className="py-2 font-medium">{m.description}</td>

                <td className="py-2 flex items-center space-x-1 text-gray-600">
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                  <span>{m.category}</span>
                </td>

                <td
                  className={`py-2 text-right font-semibold ${
                    m.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {m.amount.toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
