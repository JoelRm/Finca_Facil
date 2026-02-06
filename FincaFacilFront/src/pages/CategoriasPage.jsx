// src/pages/CategoriasPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import YearFilter from '../components/YearFilter';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getCategorias, getMovimientos, getFiltros } from '../api/dashboard';
import UserMenu from "../components/UserMenu";

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR', // cámbialo a 'PEN' si quieres
  });

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-ES') : '';

const categoryVisual = (name) => {
  const raw = (name || '').toLowerCase();
  let emoji = '💸';
  let color = 'bg-gray-100 text-gray-700';
  let chartColor = '#6B7280';

  if (raw.includes('luz')) {
    emoji = '💡';
    color = 'bg-amber-100 text-amber-700';
    chartColor = '#FBBF24';
  } else if (raw.includes('agua')) {
    emoji = '💧';
    color = 'bg-sky-100 text-sky-700';
    chartColor = '#0EA5E9';
  } else if (raw.includes('seguro')) {
    emoji = '🛡️';
    color = 'bg-emerald-100 text-emerald-700';
    chartColor = '#10B981';
  } else if (raw.includes('mantenimiento')) {
    emoji = '🛠️';
    color = 'bg-indigo-100 text-indigo-700';
    chartColor = '#6366F1';
  } else if (raw.includes('nómina')) {
    emoji = '👤';
    color = 'bg-purple-100 text-purple-700';
    chartColor = '#A855F7';
  } else if (raw.includes('alquiler')) {
    emoji = '🏠';
    color = 'bg-pink-100 text-pink-700';
    chartColor = '#EC4899';
  }

  return { emoji, color, chartColor };
};

export default function CategoriasPage() {
  const [searchParams] = useSearchParams();
  const initialYear = Number(searchParams.get('year'));
  const initialBankIdRaw = searchParams.get('bankId');

  // 🔹 Filtros
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(
    Number.isNaN(initialYear) ? null : initialYear
  );

  // OJO: manejamos el id de banco como STRING en el select
  const [accountsData, setAccountsData] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(
    initialBankIdRaw ? String(initialBankIdRaw) : ''
  );
  const [selectedBankName, setSelectedBankName] = useState(null);

  // 🔹 Datos
  const [categorias, setCategorias] = useState([]);
  const [expanded, setExpanded] = useState({});

  // 🔹 UI
  const [loading, setLoading] = useState(false);
  const [loadingCategoriaId, setLoadingCategoriaId] = useState(null);
  const [error, setError] = useState(null);

  // 1️⃣ Cargar filtros (años + bancos) una sola vez
  useEffect(() => {
    const loadFiltros = async () => {
      try {
        const data = await getFiltros();
        const { anios, bancos } = data;

        // Años
        let yearList = anios && anios.length ? anios : [2025, 2024, 2023];
        yearList = [...yearList].sort((a, b) => b - a);
        setYears(yearList);

        if (!selectedYear) {
          setSelectedYear(yearList[0]);
        }

        // Bancos
        const mappedAccounts =
          (bancos || []).map((b) => ({
            id: String(b.id), // 👈 string para evitar líos en el select
            bank: b.alias || b.nombre,
            bankName: b.nombre,
            balance: b.saldo_actual,
            accountNumber: b.accountNumber,
          })) || [];

        setAccountsData(mappedAccounts);

        if (mappedAccounts.length > 0) {
          // si vino bankId en query y existe, lo usamos, si no el primero
          const fromQuery = initialBankIdRaw
            ? mappedAccounts.find((a) => a.id === String(initialBankIdRaw))
            : null;

          const first = fromQuery || mappedAccounts[0];

          setSelectedBankId((prev) => prev || first.id);
          setSelectedBankName(first.bank);
        }
      } catch (err) {
        console.error('Error cargando filtros de categorías:', err);
        setError('No se pudieron cargar los filtros.');
      }
    };

    loadFiltros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  const handleBankChange = (event) => {
    const bankIdStr = event.target.value;
    setSelectedBankId(bankIdStr);

    const account = accountsData.find((a) => a.id === bankIdStr);
    setSelectedBankName(account?.bank ?? null);
    setExpanded({}); // colapsar detalles al cambiar banco
  };

  // 2️⃣ Cargar categorías cuando cambian año o banco
  useEffect(() => {
    const load = async () => {
      if (!selectedYear || !selectedBankId) return;

      const bankIdNum = Number(selectedBankId);
      if (Number.isNaN(bankIdNum)) return;

      try {
        setLoading(true);
        setError(null);
        // getCategorias(anio, mes, bancoId)
        const res = await getCategorias(selectedYear, null, bankIdNum);
        setCategorias(res || []);
        setExpanded({});
      } catch (err) {
        console.error('Error cargando categorías:', err);
        setError('No se pudieron cargar las categorías.');
        setCategorias([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedYear, selectedBankId]);

  const resumen = useMemo(() => {
    const total = categorias.reduce(
      (sum, c) => sum + Number(c.total || 0),
      0
    );

    const mayor = categorias.reduce(
      (max, c) =>
        Number(c.total) > Number(max.total) ? c : max,
      { total: 0 }
    );

    return {
      total,
      mayorCategoria: mayor.nombre_categoria || '',
      mayorMonto: mayor.total || 0,
    };
  }, [categorias]);

// Paleta igual a la del Dashboard
const PALETTE = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#22C55E', // Green
  '#FACC15', // Yellow
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#A855F7', // Purple
];

const chartData = categorias.map((c, idx) => ({
  type: c.nombre_categoria,
  value: Number(c.total || 0),
  color: PALETTE[idx % PALETTE.length],
}));

  const toggleCategoria = async (cat) => {
    const id = cat.categoria_id ?? cat.id;

    // si ya está abierta, la cerramos
    if (expanded[id]) {
      setExpanded((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }

    if (!selectedYear || !selectedBankId) return;

    const bankIdNum = Number(selectedBankId);
    if (Number.isNaN(bankIdNum)) return;

    try {
      setLoadingCategoriaId(id);

      // getMovimientos(anio, bancoId, categoriaId, tipo, limit, offset)
      const movs = await getMovimientos(
        selectedYear,
        bankIdNum,
        id,
        null,   // tipo (ingreso/egreso) -> null = todos
        200,    // límite
        0
      );

      setExpanded((prev) => ({
        ...prev,
        [id]: movs || [],
      }));
    } catch (e) {
      console.error('Error cargando movimientos por categoría', e);
      setExpanded((prev) => ({
        ...prev,
        [id]: [],
      }));
    } finally {
      setLoadingCategoriaId(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="px-6 py-3 bg-white border-b flex justify-between items-center">
  {/* IZQUIERDA: título + subtítulo + volver */}
  <div>
    <h1 className="text-sm font-semibold text-gray-900">
      Análisis por Categorías
    </h1>
    <p className="text-xs text-gray-500">
      {selectedYear
        ? `Año ${selectedYear}${
            selectedBankName ? ` · ${selectedBankName}` : ''
          }`
        : 'Selecciona año y banco'}
    </p>

    {/* Link de volver, más discreto bajo el subtítulo */}
    <div className="mt-1">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-800"
      >
        <span>←</span>
        <span>Volver al dashboard</span>
      </Link>
    </div>
  </div>

  {/* DERECHA: filtros + usuario */}
  <div className="flex items-center gap-4">
    {/* Filtro banco */}
    <div className="flex flex-col">
      <label className="text-[10px] uppercase text-gray-400 mb-1">
        Cuenta / banco
      </label>
      <select
        value={selectedBankId}
        onChange={handleBankChange}
        className="h-9 min-w-[160px] rounded-full border border-gray-200 text-xs px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        {accountsData.length === 0 && (
          <option value="">Sin cuentas</option>
        )}
        {accountsData.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.bank}{' '}
            {acc.accountNumber ? `· ${acc.accountNumber}` : ''}
          </option>
        ))}
      </select>
    </div>

    {/* Filtro año */}
    <div className="flex flex-col">
      <label className="text-[10px] uppercase text-gray-400 mb-1">
        Año
      </label>
      <YearFilter
        value={selectedYear}
        options={years}
        onChange={(y) => {
          setSelectedYear(y);
          setExpanded({});
        }}
      />
    </div>

    {/* Menú de usuario */}
    <UserMenu />
  </div>
</header>


        {/* CONTENIDO */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-5xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-xs text-gray-500 mb-2">
                Cargando categorías...
              </div>
            )}

            {/* DONUT CENTRAL */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-900">
                Distribución de gastos por categoría
              </h3>

              <div className="flex flex-col md:flex-row items-center justify-center">
                <div className="w-60 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="type"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                    >
                      {chartData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="md:ml-6 mt-4 md:mt-0 text-sm space-y-1">
                  <p className="font-semibold text-gray-900">
                    Total anual: {formatCurrency(resumen.total)}
                  </p>
                  <p className="text-gray-600">
                    Categoría más fuerte:
                    <span className="font-semibold">
                      {' '}
                      {resumen.mayorCategoria} (
                      {formatCurrency(resumen.mayorMonto)})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* GRID DE CATEGORIAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categorias.map((cat) => {
                const id = cat.categoria_id ?? cat.id;
                const visual = categoryVisual(cat.nombre_categoria);
                const expandedMovs = expanded[id];

                const porcentaje =
                  resumen.total > 0
                    ? ((Number(cat.total) / resumen.total) * 100).toFixed(1)
                    : 0;

                return (
                  <div
                    key={id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    <button
                      className="w-full flex justify-between items-center px-4 py-3"
                      onClick={() => toggleCategoria(cat)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${visual.color}`}
                        >
                          {visual.emoji}
                        </div>

                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">
                            {cat.nombre_categoria}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(cat.total)} · {porcentaje}%
                          </p>
                        </div>
                      </div>

                      <span className="text-gray-400 text-xs">
                        {expandedMovs ? '▴' : '▾'}
                      </span>
                    </button>

                    {/* barra progreso */}
                    <div className="px-4 pb-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 bg-purple-500 rounded-full"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>

                    {/* detalle expandido */}
                    {expandedMovs && (
                      <div className="px-4 pb-3 space-y-1 text-xs max-h-56 overflow-y-auto">
                        {loadingCategoriaId === id && (
                          <div className="text-gray-400 text-[11px] italic mb-1">
                            Cargando movimientos...
                          </div>
                        )}

                        {expandedMovs.length === 0 &&
                          loadingCategoriaId !== id && (
                            <div className="text-gray-400 text-[11px] italic">
                              No hay movimientos en esta categoría para este
                              año/banco.
                            </div>
                          )}

                        {expandedMovs.map((mov) => (
                          <div
                            key={mov.id}
                            className="flex justify_between items-center border border-gray-100 rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="font-medium truncate text-gray-800">
                                {mov.description}
                              </p>
                              <p className="text-gray-400 text-[10px]">
                                {mov.movement_date
                                  ? formatDate(mov.movement_date)
                                  : ''}
                              </p>
                            </div>

                            <div className="text-right">
                              <p
                                className={
                                  mov.amount < 0
                                    ? 'font-semibold text-red-500'
                                    : 'font-semibold text-emerald-600'
                                }
                              >
                                {formatCurrency(mov.amount)}
                              </p>
                              <p className="text-gray-400 text-[10px]">
                                Saldo:{' '}
                                {formatCurrency(mov.balance_after)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
