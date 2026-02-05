// src/pages/Dashboard.jsx
import { useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import YearFilter from '../components/YearFilter';
import BalanceChart from '../components/BalanceChart';
import KPICard from '../components/KPICard';
import SaldosPanel from '../components/SaldosPanel';
import ExpensesDonut from '../components/ExpensesDonut';
import BankMovementsTable from '../components/BankMovementsTable';

import {
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  HomeModernIcon,
  TruckIcon,
  BanknotesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';


// ===================================================
// BASE DATA (plantillas)

const baseBalanceData = [
  { month: 'Ene 24', ingresos: 21000, gastos: 12000, saldo: 15000 },
  { month: 'Feb 24', ingresos: 16000, gastos: 9000, saldo: 15500 },
  { month: 'Mar 24', ingresos: 13000, gastos: 7000, saldo: 16000 },
  { month: 'Abr 24', ingresos: 17000, gastos: 8000, saldo: 17500 },
  { month: 'May 24', ingresos: 18000, gastos: 9500, saldo: 17000 },
  { month: 'Jun 24', ingresos: 15000, gastos: 8500, saldo: 16000 },
  { month: 'Jul 24', ingresos: 15500, gastos: 9000, saldo: 15800 },
  { month: 'Ago 24', ingresos: 19000, gastos: 9200, saldo: 17000 },
  { month: 'Sep 24', ingresos: 17500, gastos: 8800, saldo: 17200 },
  { month: 'Oct 24', ingresos: 18500, gastos: 9300, saldo: 18000 },
  { month: 'Nov 24', ingresos: 17000, gastos: 9500, saldo: 17600 },
  { month: 'Dic 24', ingresos: 19500, gastos: 9800, saldo: 19000 },
];

const baseExpensesData = [
  { type: 'Seguridad', value: 23965.74, color: '#22C55E', icon: ShieldCheckIcon },
  { type: 'Mantenimiento', value: 22325.55, color: '#FACC15', icon: WrenchScrewdriverIcon },
  { type: 'Alquiler local', value: 24305.63, color: '#EC4899', icon: HomeModernIcon },
  { type: 'Proveedores', value: 139265.23, color: '#6366F1', icon: TruckIcon },
  { type: 'Préstamos', value: 18963.32, color: '#F97316', icon: BanknotesIcon },
  { type: 'Otros', value: 11292.62, color: '#3B82F6', icon: Squares2X2Icon },
];

// Helpers para crear variaciones por banco
const scaleBalance = (factorIngresos, factorGastos) =>
  baseBalanceData.map((d) => ({
    month: d.month,
    ingresos: Math.round(d.ingresos * factorIngresos),
    gastos: Math.round(d.gastos * factorGastos),
    saldo: Math.round((d.ingresos * factorIngresos) - (d.gastos * factorGastos)),
  }));

const scaleExpenses = (factor) =>
  baseExpensesData.map((e) => ({
    ...e,
    value: Math.round(e.value * factor),
  }));

// ===================================================
// LISTA DE BANCOS (para el card de Saldos)
const accountsData = [
  { bank: 'CAIXABANK', balance: '43.533,53 €' },
  { bank: 'BANCO SANTANDER', balance: '135.235,11 €' },
  { bank: 'BBVA', balance: '89.125,02 €' },
];

// ===================================================
// DATA COMPLETA POR BANCO
const bankData = {
  CAIXABANK: {
    // algo más pequeñito
    balanceData: scaleBalance(0.7, 0.65),
    expensesData: scaleExpenses(0.7),
    kpis: { pagos: 180000.0, cobros: 230000.0 },
    movements: [
      { id: 1, date: '10/02/2024', description: 'Cuota Piso 201', category: 'Ingreso', amount: 120 },
      { id: 2, date: '09/02/2024', description: 'Limpieza mensual', category: 'Mantenimiento', amount: -300 },
      { id: 3, date: '08/02/2024', description: 'Cuota Piso 101', category: 'Ingreso', amount: 120 },
      { id: 4, date: '05/02/2024', description: 'Jardinería', category: 'Mantenimiento', amount: -180 },
      { id: 5, date: '03/02/2024', description: 'Cuota Piso 402', category: 'Ingreso', amount: 120 },
      { id: 6, date: '02/02/2024', description: 'Electricidad', category: 'Servicios', amount: -90 },
      { id: 7, date: '01/02/2024', description: 'Ascensor', category: 'Mantenimiento', amount: -220 },
      { id: 8, date: '31/01/2024', description: 'Cuota extra', category: 'Ingreso', amount: 250 },
      { id: 9, date: '28/01/2024', description: 'Agua', category: 'Servicios', amount: -130 },
      { id: 10, date: '26/01/2024', description: 'Cuota Piso 303', category: 'Ingreso', amount: 120 },
    ],
  },

  'BANCO SANTANDER': {
    // más grande, como si fuese la cuenta principal
    balanceData: scaleBalance(1.2, 1.1),
    expensesData: scaleExpenses(1.1),
    kpis: { pagos: 320000.0, cobros: 520000.0 },
    movements: [
      { id: 1, date: '11/02/2024', description: 'Intereses', category: 'Ingreso', amount: 14.3 },
      { id: 2, date: '09/02/2024', description: 'Reparación cisterna', category: 'Mantenimiento', amount: -420 },
      { id: 3, date: '07/02/2024', description: 'Cuota Piso 505', category: 'Ingreso', amount: 120 },
      { id: 4, date: '06/02/2024', description: 'Pintura', category: 'Mantenimiento', amount: -380 },
      { id: 5, date: '03/02/2024', description: 'Cuota Piso 203', category: 'Ingreso', amount: 120 },
      { id: 6, date: '01/02/2024', description: 'Internet', category: 'Servicios', amount: -70 },
      { id: 7, date: '30/01/2024', description: 'Cuota Piso 108', category: 'Ingreso', amount: 120 },
      { id: 8, date: '29/01/2024', description: 'Limpieza', category: 'Mantenimiento', amount: -300 },
      { id: 9, date: '27/01/2024', description: 'Cuota extra', category: 'Ingreso', amount: 200 },
      { id: 10, date: '25/01/2024', description: 'Agua', category: 'Servicios', amount: -130 },
    ],
  },

  BBVA: {
    // un punto intermedio
    balanceData: scaleBalance(0.9, 0.8),
    expensesData: scaleExpenses(0.9),
    kpis: { pagos: 210000.0, cobros: 260000.0 },
    movements: [
      { id: 1, date: '12/02/2024', description: 'Cuota Piso 204', category: 'Ingreso', amount: 120 },
      { id: 2, date: '11/02/2024', description: 'Tubería', category: 'Mantenimiento', amount: -600 },
      { id: 3, date: '09/02/2024', description: 'Cuota Piso 401', category: 'Ingreso', amount: 120 },
      { id: 4, date: '08/02/2024', description: 'Luz común', category: 'Servicios', amount: -110 },
      { id: 5, date: '07/02/2024', description: 'Cuota Piso 302', category: 'Ingreso', amount: 120 },
      { id: 6, date: '06/02/2024', description: 'Jardinería', category: 'Mantenimiento', amount: -180 },
      { id: 7, date: '03/02/2024', description: 'Cuota Piso 102', category: 'Ingreso', amount: 120 },
      { id: 8, date: '02/02/2024', description: 'Ascensor', category: 'Servicios', amount: -220 },
      { id: 9, date: '30/01/2024', description: 'Cuota extra', category: 'Ingreso', amount: 200 },
      { id: 10, date: '29/01/2024', description: 'Limpieza', category: 'Mantenimiento', amount: -300 },
    ],
  },
};


// ===================================================
// DASHBOARD

export default function Dashboard() {
  const [period, setPeriod] = useState('Este año');
  const [selectedBank, setSelectedBank] = useState(accountsData[0].bank);

  const selectedBankData = bankData[selectedBank];

  const formatEuro = (value) =>
    value.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Gráfico superior: depende de periodo Y de banco
  const balanceData = useMemo(() => {
    if (!selectedBankData) return [];
    if (period === 'Este mes') {
      return selectedBankData.balanceData.slice(-1);
    }
    return selectedBankData.balanceData;
  }, [period, selectedBankData, selectedBank]);

  const subtitle = useMemo(() => {
    if (period === 'Este año') return 'Datos mensuales 2024';
    if (period === 'Últimos 12 meses') return 'Últimos 12 meses';
    if (period === 'Este mes') return 'Detalle del mes actual';
    return '';
  }, [period]);


  const handleAddBank = () => {
    console.log('Agregar banco');
  };

  const handleBankClick = (bankName) => {
    setSelectedBank(bankName);
    console.log('Banco seleccionado:', bankName);
  };


  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col">
        
        {/* TOPBAR */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b">
          <div className="flex items-center space-x-2">
            <button className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-medium">
              Finca Facil
            </button>
            <span className="text-xs text-gray-400">
              Banco seleccionado: <span className="font-semibold text-gray-700">{selectedBank}</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button className="h-9 px-3 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
              ES
            </button>
            <button className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              ⟳
            </button>
            <YearFilter value={period} onChange={setPeriod} />
            <div className="h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
              A
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Gráfico superior */}
          <BalanceChart data={balanceData} subtitle={subtitle} />

          {/* Zona inferior */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* IZQUIERDA: KPIs + Saldos */}
            <div className="space-y-4">

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KPICard
                  title="Pagos"
                  value={formatEuro(selectedBankData.kpis.pagos)}
                  badge={{
                    label: '🔥',
                    style: { backgroundColor: '#FEF2F2', color: '#EF4444' },
                  }}
                />

                <KPICard
                  title="Cobros"
                  value={formatEuro(selectedBankData.kpis.cobros)}
                  badge={{
                    label: '💳',
                    style: { backgroundColor: '#ECFDF5', color: '#10B981' },
                  }}
                />
              </div>

              {/* Saldos */}
              <SaldosPanel
                accounts={accountsData}
                onAddBank={handleAddBank}
                onBankClick={handleBankClick}
                selectedBank={selectedBank}
              />
            </div>

            {/* DERECHA: Dona (filtrada por banco) */}
            <ExpensesDonut data={selectedBankData.expensesData} />

          </section>

          {/* Movimientos del banco seleccionado */}
          <BankMovementsTable
            items={selectedBankData.movements.slice(0, 10)}
            bankName={selectedBank}
          />

        </main>
      </div>
    </div>
  );
}
