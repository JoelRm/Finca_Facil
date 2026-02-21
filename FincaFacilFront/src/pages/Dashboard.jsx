// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import YearFilter from '../components/YearFilter';
import BalanceChart from '../components/BalanceChart';
import KPICard from '../components/KPICard';
import SaldosPanel from '../components/SaldosPanel';
import ExpensesDonut from '../components/ExpensesDonut';
import BankMovementsTable from '../components/BankMovementsTable';
import DetailDrawer from '../components/DetailDrawer';
import UserMenu from "../components/UserMenu";
import MorosidadCard from '../components/MorosidadCard';
import AccountHealthCard from '../components/AccountHealthCard';

import IncomeByCategoryCard from "../components/IncomeByCategoryCard";
import TopIncomesCard from "../components/TopIncomesCard";

import { getCommunityMorosidad } from '../api/owners';
import { useNavigate } from "react-router-dom";

import {
  getFiltros,
  getKpis,
  getEvolucion,
  getCategorias,
  getMovimientos,
} from '../api/dashboard';

import AssignBankModal from "../components/AssignBankModal";
import { getBanks, assignBank } from "../api/banks";

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function Dashboard() {
  const navigate = useNavigate();

  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState(null);
  const [detailItems, setDetailItems] = useState([]);

  const [accountsData, setAccountsData] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedBankName, setSelectedBankName] = useState(null);

  const [morosidad, setMorosidad] = useState({ percent: 0, expected: 0, paidApplied: 0, mora: 0 });

  // ✅ KPIs NO dependen del banco seleccionado (se calculan a nivel comunidad/año)
  const [kpis, setKpis] = useState({ ingresos: 0, egresos: 0, saldo: 0 });

  // ✅ Esto sí depende del banco seleccionado
  const [balanceData, setBalanceData] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [movements, setMovements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState(null);

  // Modal asignar banco
  const [assignOpen, setAssignOpen] = useState(false);
  const [banksList, setBanksList] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState(null);
  const [assignSyncing, setAssignSyncing] = useState(false);
const [movementsGlobal, setMovementsGlobal] = useState([]);
  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem('ff_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const authUser = getStoredUser();
  const communityId = authUser?.communityId ? Number(authUser.communityId) : null;
  const email = authUser?.email || null;

  const subtitle = useMemo(() => {
    if (!selectedYear) return '';
    return `Datos mensuales ${selectedYear}`;
  }, [selectedYear]);

  const ganancia = useMemo(() => {
    const ing = Number(kpis.ingresos || 0);
    const gas = Number(kpis.egresos || 0);
    return ing - gas;
  }, [kpis.ingresos, kpis.egresos]);

  // ✅ cargar filtros
  const loadFiltros = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getFiltros();
      const { anios, bancos } = data;

      let yearList = anios && anios.length ? anios : [2025, 2024, 2023];
      yearList = [...yearList].sort((a, b) => b - a);
      setYears(yearList);
      setSelectedYear((prev) => prev ?? yearList[0]);

      const mappedAccounts =
        (bancos || []).map((b) => ({
          id: b.id,
          bank: b.alias || b.bank_name,
          balance: b.saldo_actual,
          bankName: b.bank_name,
          accountNumber: b.account_number,
        })) || [];

      setAccountsData(mappedAccounts);

      if (mappedAccounts.length > 0) {
        setSelectedBankId(mappedAccounts[0].id);
        setSelectedBankName(mappedAccounts[0].bank);
      } else {
        setSelectedBankId(null);
        setSelectedBankName(null);
      }
    } catch (err) {
      console.error('Error cargando filtros:', err);
      setError('No se pudieron cargar los filtros del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiltros();
  }, [loadFiltros]);

  // ✅ 1) Cargar KPIs + Morosidad SOLO por año (NO por banco)
  useEffect(() => {
    const loadYearWide = async () => {
      if (!selectedYear || !communityId) return;

      try {
        setLoadingDashboard(true);
        setError(null);

        const [kpisRes, morosidadRes, movsGlobal] = await Promise.all([
          getKpis(selectedYear, null, null),
          getCommunityMorosidad(communityId, selectedYear, 12),
          // ✅ movimientos sin banco (global año)
          getMovimientos(selectedYear, null, null, null, 500, 0),
        ]);

        setMovementsGlobal(movsGlobal || []);

        setMorosidad({
          percent: Number(morosidadRes?.percent ?? 0),
          expected: Number(morosidadRes?.expected ?? 0),
          paidApplied: Number(morosidadRes?.paidApplied ?? 0),
          mora: Number(morosidadRes?.mora ?? 0),
        });

        setKpis({
          ingresos: kpisRes?.ingresos ?? 0,
          egresos: kpisRes?.egresos ?? 0,
          saldo: kpisRes?.saldo ?? 0,
        });
      } catch (err) {
        console.error('Error cargando KPIs/Morosidad:', err);
        setError('No se pudieron cargar los KPIs del año');
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadYearWide();
  }, [selectedYear, communityId]);

  // ✅ 2) Cargar charts + categorías + movimientos por BANCO seleccionado
  useEffect(() => {
    const loadBankWide = async () => {
      if (!selectedYear || !selectedBankId) return;

      try {
        setLoadingDashboard(true);
        setError(null);

        const [evolucionRes, categoriasRes, movimientosRes] = await Promise.all([
          getEvolucion(selectedYear, selectedBankId),
          getCategorias(selectedYear, null, selectedBankId),
          getMovimientos(selectedYear, selectedBankId, null, null, 50, 0),
        ]);

        const evoChart = evolucionRes.chart || evolucionRes || [];
        let runningSaldo = 0;

        const mappedBalance = (evoChart || []).map((row) => {
          const m = row.mes;
          const label =
            m >= 1 && m <= 12
              ? `${MONTH_LABELS[m - 1]} ${String(selectedYear).slice(-2)}`
              : `Mes ${m}`;

          const ingresos = Number(row.ingresos || 0);
          const gastos = Number(row.gastos || 0);
          runningSaldo += ingresos - gastos;

          return { month: label, ingresos, gastos, saldo: runningSaldo };
        });
        setBalanceData(mappedBalance);

        const palette = ['#6366F1','#EC4899','#22C55E','#FACC15','#F97316','#3B82F6','#0EA5E9','#A855F7'];
        const mappedCategories = (categoriasRes || []).map((c, idx) => ({
          type: c.nombre_categoria,
          value: Number(c.total || 0),
          color: palette[idx % palette.length],
        }));
        setCategoriesData(mappedCategories);

        setMovements(movimientosRes || []);
      } catch (err) {
        console.error('Error cargando dashboard por banco:', err);
        setError('No se pudieron cargar los datos del banco seleccionado');
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadBankWide();
  }, [selectedYear, selectedBankId]);

  const handleBankClick = (bankName) => {
    setSelectedBankName(bankName);
    const account = accountsData.find((a) => a.bank === bankName);
    if (account) setSelectedBankId(account.id);
  };

  const handleAddBank = async () => {
    try {
      setAssignOpen(true);
      setBanksError(null);
      setBanksLoading(true);
      const list = await getBanks();
      setBanksList(Array.isArray(list) ? list : []);
    } catch (e) {
      setBanksError(e.message || "No se pudo cargar la lista de bancos");
    } finally {
      setBanksLoading(false);
    }
  };

  const handleSelectBank = async (bank) => {
    try {
      setBanksError(null);
      setAssignSyncing(true);

      const res = await assignBank({
        email,
        communityId,
        bankId: bank.id,
      });

      if (res?.ok === true) {
        try {
          const raw = localStorage.getItem("ff_auth_user");
          const current = raw ? JSON.parse(raw) : null;

          if (current && res?.community?.id) {
            const newCommunityId = Number(res.community.id);

            const updated = {
              ...current,
              communityId: newCommunityId,
              defaultCommunity: {
                ...(current.defaultCommunity || {}),
                id: newCommunityId,
                name: res.community.name,
                code: res.community.code,
              },
            };

            localStorage.setItem("ff_auth_user", JSON.stringify(updated));
          }
        } catch {}

        window.location.reload();
        return;
      }

      setBanksError("No se pudo sincronizar el banco (respuesta inválida).");
    } catch (e) {
      setBanksError(e.message || "No se pudo asignar el banco");
    } finally {
      setAssignSyncing(false);
    }
  };

  const openDetail = async (type) => {
    if (!selectedYear) return;

    try {
      const tipo =
        type === 'gastos' ? 'pagos'
        : type === 'ingresos' ? 'cobros'
        : type === 'pagos' ? 'pagos'
        : type === 'cobros' ? 'cobros'
        : undefined;

      // ✅ Detalle: si quieres que sea global (sin banco), pasa null en bankId
      // Si lo quieres por banco seleccionado, deja selectedBankId
      const bankIdForDetail = null; // 👈 GLOBAL (como los KPIs)

      const movs = await getMovimientos(
        selectedYear,
        bankIdForDetail,
        null,
        tipo,
        30,
        0
      );

      setDetailType(type);
      setDetailItems(movs || []);
      setDetailOpen(true);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  };

  const closeDetail = () => setDetailOpen(false);

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // ✅ Ganancia/Pérdida (UI)
  const gananciaValue = ganancia; // ing - gas
  const gananciaTitle = gananciaValue < 0 ? 'Pérdida' : 'Ganancia';
  const gananciaDisplay = formatCurrency(Math.abs(gananciaValue));
  const gananciaVariant = gananciaValue < 0 ? 'expense' : 'profit';
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-sm">Cargando filtros del dashboard...</div>
      </div>
    );
  }

  const noBanks = accountsData.length === 0;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b">
          <div className="flex items-center space-x-2">
            <button className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-medium">
              Finca Facil
            </button>

            {selectedBankName && (
              <span className="text-xs text-gray-500">
                Banco seleccionado: <span className="font-semibold">{selectedBankName}</span>
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
                if (selectedYear) setSelectedYear((y) => y);
                if (noBanks) loadFiltros();
              }}
            >
              ⟳
            </button>

            <YearFilter
              value={selectedYear}
              options={years}
              onChange={setSelectedYear}
            />

            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
              {error}
            </div>
          )}

          {noBanks ? (
            <div className="bg-white border rounded-xl p-6 flex items-center justify-center">
              <div className="w-full max-w-xl text-center">
                <div className="text-sm text-gray-600 mb-4">
                  Aún no tienes entidades bancarias configuradas para tu comunidad.
                </div>

                <button
                  onClick={handleAddBank}
                  className="px-6 py-3 rounded-full border border-blue-400 text-blue-600 font-medium hover:bg-blue-50"
                >
                  Añadir otra entidad
                </button>

                <div className="mt-4 text-xs text-gray-400">
                  Visualiza aquí cualquier banco, tarjeta, préstamo, inversión...
                </div>
              </div>
            </div>
          ) : (
            <>
              {loadingDashboard && (
                <div className="text-xs text-gray-500 mb-2">
                  Actualizando datos del dashboard...
                </div>
              )}

              <BalanceChart data={balanceData} subtitle={subtitle} />

              <section className="space-y-4">
                {/* ✅ KPIs ARRIBA (NO SE FILTRAN POR BANCO) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <KPICard
                    title="Total ingresos"
                    value={formatCurrency(kpis.ingresos)}
                    variant="income"
                    onSeeMore={() => openDetail('ingresos')}
                  />

                  <KPICard
                    title="Total gastos"
                    value={formatCurrency(kpis.egresos)}
                    variant="expense"
                    onSeeMore={() => openDetail('gastos')}
                  />

                  <KPICard
                    title={gananciaTitle}
                    value={gananciaDisplay}
                    variant={gananciaVariant}
                  />
                </div>

                {/* ✅ Abajo 3: Morosidad + Ingreso por categoría + Top 5 ingresos */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <MorosidadCard
                    percent={morosidad.percent}
                    onAdd={() => {
                      navigate("/owners-grid", {
                        state: {
                          communityId,
                          anio: selectedYear,
                          hastaMes: 12,
                          bankId: selectedBankId, // aquí sí tiene sentido el banco
                        },
                      });
                    }}
                  />

                  <IncomeByCategoryCard items={movementsGlobal} />
                <TopIncomesCard items={movementsGlobal} />
                </div>

                {/* ✅ Abajo: Saldos + (Salud + Donut) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <SaldosPanel
                    accounts={accountsData}
                    onAddBank={handleAddBank}
                    onBankClick={handleBankClick}
                    selectedBank={selectedBankName}
                  />

                  <div className="space-y-4">
                    <AccountHealthCard ingresos={kpis.ingresos} gastos={kpis.egresos} />

                    <ExpensesDonut
                      data={categoriesData}
                      year={selectedYear}
                      bankId={selectedBankId}
                    />
                  </div>
                </div>
              </section>

              <BankMovementsTable
                items={movements}
                bankName={selectedBankName}
                bankId={selectedBankId}
                year={selectedYear}
              />
            </>
          )}
        </main>

        <DetailDrawer
          open={detailOpen}
          type={detailType}
          items={detailItems}
          onClose={closeDetail}
        />

        <AssignBankModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          banks={banksList}
          loading={banksLoading}
          error={banksError}
          syncing={assignSyncing}
          onSelectBank={handleSelectBank}
        />
      </div>
    </div>
  );
}