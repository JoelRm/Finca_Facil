// src/pages/Movimientos.jsx
import { useEffect, useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import YearFilter from '../components/YearFilter';
import BankMovementsTable from '../components/BankMovementsTable';
import UserMenu from "../components/UserMenu";

import {
  getFiltros,
  getMovimientos,
} from '../api/dashboard';

export default function Movimientos() {
  // filtros
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const [accountsData, setAccountsData] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedBankName, setSelectedBankName] = useState(null);

  // datos
  const [movements, setMovements] = useState([]);

  // estados UI
  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [error, setError] = useState(null);

  const subtitle = useMemo(() => {
    if (!selectedYear) return '';
    return `Movimientos del año ${selectedYear}${
      selectedBankName ? ` · ${selectedBankName}` : ''
    }`;
  }, [selectedYear, selectedBankName]);

  // 1️⃣ Cargar filtros (años + bancos) al entrar a la página
  useEffect(() => {
    const loadFiltros = async () => {
      try {
        setLoadingFiltros(true);
        setError(null);

        const data = await getFiltros();
        const { anios, bancos } = data;

        // años
        let yearList = anios && anios.length ? anios : [2025, 2024, 2023];
        yearList = [...yearList].sort((a, b) => b - a);
        setYears(yearList);
        setSelectedYear(yearList[0]);

        // bancos
        const mappedAccounts =
          (bancos || []).map((b) => ({
            id: b.id,
            bank: b.alias || b.nombre,
            bankName: b.nombre,
            balance: b.saldo_actual,
            accountNumber: b.accountNumber,
          })) || [];

        setAccountsData(mappedAccounts);

        if (mappedAccounts.length > 0) {
          setSelectedBankId(mappedAccounts[0].id);
          setSelectedBankName(mappedAccounts[0].bank);
        }
      } catch (err) {
        console.error('Error cargando filtros de movimientos:', err);
        setError('No se pudieron cargar los filtros de la página de movimientos');
      } finally {
        setLoadingFiltros(false);
      }
    };

    loadFiltros();
  }, []);

  // 2️⃣ Cargar movimientos cuando cambian año o banco
  useEffect(() => {
    const loadMovimientos = async () => {
      if (!selectedYear || !selectedBankId) return;

      try {
        setLoadingMovs(true);
        setError(null);

        // getMovimientos(anio, bancoId, categoriaId, tipo, limit, offset)
        const movs = await getMovimientos(
          selectedYear,
          selectedBankId,
          null,   // sin categoria
          null,   // sin tipo (ingreso/egreso)
          100,    // por ejemplo 100 registros
          0
        );

        setMovements(movs || []);
      } catch (err) {
        console.error('Error cargando movimientos:', err);
        setError('No se pudieron cargar los movimientos');
      } finally {
        setLoadingMovs(false);
      }
    };

    loadMovimientos();
  }, [selectedYear, selectedBankId]);

  const handleBankChange = (event) => {
    const bankId = event.target.value;
    if (!bankId) return;

    const account = accountsData.find((a) => String(a.id) === String(bankId));
    if (account) {
      setSelectedBankId(account.id);
      setSelectedBankName(account.bank);
    }
  };

  if (loadingFiltros) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">
          Cargando filtros de movimientos...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b">
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-gray-900">Movimientos</h1>
            <span className="text-xs text-gray-400">{subtitle}</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Filtro de banco */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase text-gray-400 mb-1">
                Cuenta / banco
              </label>
              <select
                value={selectedBankId ?? ''}
                onChange={handleBankChange}
                className="h-9 min-w-[160px] rounded-full border border-gray-200 text-xs px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {accountsData.length === 0 && (
                  <option value="">Sin cuentas</option>
                )}
                {accountsData.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bank} {acc.accountNumber ? `· ${acc.accountNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
            <label className="text-[10px] uppercase text-gray-400 mb-1">
              Año
            </label>

            <YearFilter
              value={selectedYear}
              options={years}
              onChange={setSelectedYear}
            />
          </div>
          <UserMenu />
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
              {error}
            </div>
          )}

          {loadingMovs && (
            <div className="text-xs text-gray-500 mb-2">
              Cargando movimientos...
            </div>
          )}

          <BankMovementsTable
            items={movements}
            bankName={selectedBankName}
            bankId={selectedBankId}
            year={selectedYear}
            showSeeMore={false} 
            variant="detailed" 
          />
        </main>
      </div>
    </div>
  );
}
