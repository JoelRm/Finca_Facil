// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import YearFilter from '../components/YearFilter';
import BalanceChart from '../components/BalanceChart';
import KPICard from '../components/KPICard';
import SaldosPanel from '../components/SaldosPanel';
import ExpensesDonut from '../components/ExpensesDonut';
import BankMovementsTable from '../components/BankMovementsTable';
import DetailDrawer from '../components/DetailDrawer';

import {
  getFiltros,
  getKpis,
  getEvolucion,
  getCategorias,
  getMovimientos,
} from '../api/dashboard';

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export default function Dashboard() {
  // filtros
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState(null);
  const [detailItems, setDetailItems] = useState([]);

  const [accountsData, setAccountsData] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedBankName, setSelectedBankName] = useState(null);

  // datos
  const [kpis, setKpis] = useState({ ingresos: 0, egresos: 0, saldo: 0 });
  const [balanceData, setBalanceData] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [movements, setMovements] = useState([]);

  // estados UI
  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState(null);

  // subtítulo del gráfico
  const subtitle = useMemo(() => {
    if (!selectedYear) return '';
    return `Datos mensuales ${selectedYear}`;
  }, [selectedYear]);

  // 1️⃣ cargar filtros (años + bancos) al inicio
  useEffect(() => {
    const loadFiltros = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getFiltros();
        const { anios, bancos } = data;

        // años (si vienen del back, los usamos; si no, 2025–2023)
        let yearList = anios && anios.length ? anios : [2025, 2024, 2023];
        // los ordenamos de mayor a menor
        yearList = [...yearList].sort((a, b) => b - a);
        setYears(yearList);
        setSelectedYear(yearList[0]);

        // bancos -> adaptados al formato que usa SaldosPanel
        const mappedAccounts =
          (bancos || []).map((b) => ({
            id: b.id,
            bank: b.alias || b.nombre,
            balance: b.saldo_actual, // luego podemos traer el saldo real
            bankName: b.nombre,
            accountNumber: b.accountNumber,
          })) || [];

        setAccountsData(mappedAccounts);

        if (mappedAccounts.length > 0) {
          setSelectedBankId(mappedAccounts[0].id);
          setSelectedBankName(mappedAccounts[0].bank);
        }
      } catch (err) {
        console.error('Error cargando filtros:', err);
        setError('No se pudieron cargar los filtros del dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadFiltros();
  }, []);

  // 2️⃣ cargar datos del dashboard cuando cambie año o banco
  useEffect(() => {
    const loadDashboard = async () => {
      if (!selectedYear || !selectedBankId) return;

      try {
        setLoadingDashboard(true);
        setError(null);

        // pedimos todo el año completo (mes = null)
        const [kpisRes, evolucionRes, categoriasRes, movimientosRes] =
          await Promise.all([
            getKpis(selectedYear, null, selectedBankId),
            getEvolucion(selectedYear, selectedBankId),
            getCategorias(selectedYear, null, selectedBankId),
            // 👇 aquí corregimos el orden de parámetros
            // getMovimientos(anio, bancoId, categoriaId, tipo, limit, offset)
            getMovimientos(selectedYear, selectedBankId, null, null, 50, 0),
          ]);

        // KPIs
        setKpis({
          ingresos: kpisRes.ingresos ?? 0,
          egresos: kpisRes.egresos ?? 0,
          saldo: kpisRes.saldo ?? 0,
        });

        // Gráfico de barras + línea (ingresos, gastos, saldo acumulado)
        const evoChart = evolucionRes.chart || evolucionRes || [];
        let runningSaldo = 0;
        const mappedBalance = evoChart.map((row) => {
          const m = row.mes; // 1..12
          const label =
            m >= 1 && m <= 12
              ? `${MONTH_LABELS[m - 1]} ${String(selectedYear).slice(-2)}`
              : `Mes ${m}`;

          const ingresos = Number(row.ingresos || 0);
          const gastos = Number(row.gastos || 0);
          runningSaldo += ingresos - gastos;

          return {
            month: label,
            ingresos,
            gastos,
            saldo: runningSaldo,
          };
        });
        setBalanceData(mappedBalance);

        // Dona – categorías
        const palette = [
          '#6366F1',
          '#EC4899',
          '#22C55E',
          '#FACC15',
          '#F97316',
          '#3B82F6',
          '#0EA5E9',
          '#A855F7',
        ];
        const mappedCategories = (categoriasRes || []).map((c, idx) => ({
          type: c.nombre_categoria,
          value: Number(c.total || 0),
          color: palette[idx % palette.length],
        }));
        setCategoriesData(mappedCategories);

        // Movimientos (últimos N)
        setMovements(movimientosRes || []);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setError('No se pudieron cargar los datos del dashboard');
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadDashboard();
  }, [selectedYear, selectedBankId]);

  const handleBankClick = (bankName) => {
    setSelectedBankName(bankName);
    const account = accountsData.find((a) => a.bank === bankName);
    if (account) {
      setSelectedBankId(account.id);
    }
  };

  const handleAddBank = () => {
    console.log('Agregar banco');
  };

  const openDetail = async (type) => {
    if (!selectedYear || !selectedBankId) return;

    try {
      // mapeamos tipo tarjeta → filtro para el backend
      const tipo =
        type === 'pagos' ? 'pagos'
        : type === 'cobros' ? 'cobros'
        : undefined;

      // getMovimientos(anio, bancoId, categoriaId, tipo, limit, offset)
      const movs = await getMovimientos(
        selectedYear,
        selectedBankId,
        null,   // sin categoria
        tipo,   // 'ingreso' o 'egreso'
        30,     // límite
        0       // offset
      );

      setDetailType(type);
      setDetailItems(movs || []);
      setDetailOpen(true);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
  };

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR', // cambia a 'PEN' si quieres soles
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">
          Cargando filtros del dashboard...
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
          <div className="flex items-center space-x-2">
            <button className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-medium">
              Finca Facil
            </button>
            {selectedBankName && (
              <span className="text-xs text-gray-500">
                Banco seleccionado:{' '}
                <span className="font-semibold">{selectedBankName}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button className="h-9 px-3 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
              ES
            </button>
            <button
              className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              onClick={() => {
                // recarga manual
                if (selectedYear && selectedBankId) {
                  setSelectedYear((y) => y); // dispara el useEffect
                }
              }}
            >
              ⟳
            </button>

            <YearFilter
              value={selectedYear}
              options={years}
              onChange={setSelectedYear}
            />

            <div className="h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
              A
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
              {error}
            </div>
          )}

          {loadingDashboard && (
            <div className="text-xs text-gray-500 mb-2">
              Actualizando datos del dashboard...
            </div>
          )}

          <BalanceChart data={balanceData} subtitle={subtitle} />

          {/* ZONA INFERIOR */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* IZQUIERDA: KPIs + saldos */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KPICard
                  title="Pagos"
                  value={formatCurrency(kpis.egresos)}
                  badge={{
                    label: '🔥',
                    style: { backgroundColor: '#FEF2F2', color: '#EF4444' },
                  }}
                  onSeeMore={() => openDetail('pagos')}
                />
                <KPICard
                  title="Cobros"
                  value={formatCurrency(kpis.ingresos)}
                  badge={{
                    label: '💳',
                    style: { backgroundColor: '#ECFDF5', color: '#10B981' },
                  }}
                  onSeeMore={() => openDetail('cobros')}
                />
              </div>

              <SaldosPanel
                accounts={accountsData}
                onAddBank={handleAddBank}
                onBankClick={handleBankClick}
                selectedBank={selectedBankName}
              />
            </div>

            {/* DERECHA: DONUT */}
            <ExpensesDonut
              data={categoriesData}
              year={selectedYear}
              bankId={selectedBankId}
            />
          </section>

          {/* GRILLA DE MOVIMIENTOS */}
          <BankMovementsTable
            items={movements}
            bankName={selectedBankName}
            bankId={selectedBankId}
            year={selectedYear}
          />
        </main>

        <DetailDrawer
          open={detailOpen}
          type={detailType}
          items={detailItems}
          onClose={closeDetail}
        />
      </div>
    </div>
  );
}
