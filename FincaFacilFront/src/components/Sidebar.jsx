// src/components/Sidebar.jsx
import {
  ChartPieIcon,
  Square3Stack3DIcon,
  BanknotesIcon,
  AdjustmentsHorizontalIcon,
  BellIcon,
  Cog6ToothIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { NavLink } from 'react-router-dom';
import logo from "../assets/logo.png";

export default function Sidebar() {
  return (
    <aside className="w-20 bg-white border-r flex flex-col items-center py-4 space-y-6">
      <img
        src={logo}
        alt="Finca Fácil"
        className="h-14 w-14 rounded-full object-contain bg-white p-1 shadow border border-gray-200"
      />
      {/* menú de iconos */}
      <nav className="flex-1 flex flex-col items-center space-y-6 mt-">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            [
              'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
              isActive
                ? 'bg-purple-50 text-purple-600'
                : 'text-gray-400 hover:bg-gray-100',
            ].join(' ')
          }
        >
          <Square3Stack3DIcon className="h-6 w-6" />
        </NavLink>

        <NavLink
          to="/categorias"
          className={({ isActive }) =>
            [
              'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
              isActive
                ? 'bg-purple-50 text-purple-600'
                : 'text-gray-400 hover:bg-gray-100',
            ].join(' ')
          }
        >
          <ChartPieIcon className="h-6 w-6" />
        </NavLink>

        {/* Movimientos (billetes) */}
        <NavLink
          to="/movimientos"
          className={({ isActive }) =>
            [
              'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
              isActive
                ? 'bg-purple-50 text-purple-600'
                : 'text-gray-400 hover:bg-gray-100',
            ].join(' ')
          }
        >
          <BanknotesIcon className="h-6 w-6" />
        </NavLink>

        {/* Ajustes / filtros (por si luego lo usas para otra página) */}
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            [
              'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
              isActive
                ? 'bg-purple-50 text-purple-600'
                : 'text-gray-400 hover:bg-gray-100',
            ].join(' ')
          }
        >
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </NavLink>
      </nav>

      {/* parte inferior */}
      <div className="flex flex-col items-center space-y-3">
        <button className="h-9 w-9 rounded-xl text-gray-400 hover:bg-gray-100 flex items-center justify-center">
          <BellIcon className="h-5 w-5" />
        </button>
        <button className="h-9 w-9 rounded-xl text-gray-400 hover:bg-gray-100 flex items-center justify-center">
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
        <button className="h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center">
          <UserGroupIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
