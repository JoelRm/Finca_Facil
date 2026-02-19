const db = require('../repository/db.repository');

function buildYearWhere({ anio, mes, bankId }, alias = '') {
  const p = alias ? `${alias}.` : '';
  const where = [
    `${p}movement_date >= make_date($1, 1, 1)`,
    `${p}movement_date <  make_date($1 + 1, 1, 1)`,
  ];
  const params = [anio];
  let idx = 2;

  if (mes) {
    where.push(`EXTRACT(MONTH FROM ${p}movement_date) = $${idx}`);
    params.push(mes);
    idx++;
  }

  if (bankId) {
    where.push(`${p}bank_account_id = $${idx}`);
    params.push(bankId);
    idx++;
  }

  return { where, params };
}

exports.getFiltros = async () => {
  const aniosRes = await db.query(
    `SELECT DISTINCT EXTRACT(YEAR FROM movement_date)::int AS anio
     FROM bank_movement
     ORDER BY anio DESC`
  );

  const bancosRes = await db.query(`
    SELECT 
      ba.id,
      ba.alias,
      ba.bank_name,
      ba.account_number,
      COALESCE((
        SELECT bm.balance_after
        FROM bank_movement bm
        WHERE bm.bank_account_id = ba.id
        ORDER BY bm.movement_date DESC, bm.id DESC
        LIMIT 1
      ), 0) AS saldo_actual
    FROM bank_account ba
    ORDER BY ba.alias;
  `);

  return {
    anios: aniosRes.rows.map(r => r.anio),
    bancos: bancosRes.rows,
  };
};

exports.getKpis = async ({ anio, mes, bankId }) => {
  const { where, params } = buildYearWhere({ anio, mes, bankId });

  const kpiQuery = `
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS ingresos,
      COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS egresos
    FROM bank_movement
    WHERE ${where.join(' AND ')};
  `;
  const kpiRes = await db.query(kpiQuery, params);
  const kpi = kpiRes.rows[0] || { ingresos: 0, egresos: 0 };

  const saldoQuery = `
    SELECT balance_after
    FROM bank_movement
    WHERE ${where.join(' AND ')}
    ORDER BY movement_date DESC, id DESC
    LIMIT 1;
  `;
  const saldoRes = await db.query(saldoQuery, params);
  const saldoRow = saldoRes.rows[0];

  return {
    ingresos: Number(kpi.ingresos),
    egresos: Number(kpi.egresos),
    saldo: Number(saldoRow?.balance_after || 0),
  };
};

exports.getCategorias = async ({ anio, mes, bankId }) => {
  const { where, params } = buildYearWhere({ anio, mes, bankId }, 'bm');
  where.push('bm.amount < 0');

  const query = `
    SELECT
      c.id            AS categoria_id,
      c.name          AS nombre_categoria,
      SUM(-bm.amount) AS total
    FROM bank_movement bm
    JOIN movement_category mc ON mc.movement_id = bm.id
    JOIN category c           ON c.id = mc.category_id
    WHERE ${where.join(' AND ')}
    GROUP BY c.id, c.name
    ORDER BY total DESC;
  `;

  const r = await db.query(query, params);

  return r.rows.map(x => ({
    categoria_id: x.categoria_id,
    nombre_categoria: x.nombre_categoria,
    total: Number(x.total),
  }));
};

exports.getEvolucion = async ({ anio, bankId }) => {
  const { where, params } = buildYearWhere({ anio, bankId });

  const mensualQuery = `
    SELECT
      EXTRACT(MONTH FROM movement_date)::int             AS mes,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)   AS ingresos,
      SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END)  AS gastos
    FROM bank_movement
    WHERE ${where.join(' AND ')}
    GROUP BY mes
    ORDER BY mes;
  `;
  const mensualRes = await db.query(mensualQuery, params);

  const chart = mensualRes.rows.map(r => ({
    mes: r.mes,
    ingresos: Number(r.ingresos),
    gastos: Number(r.gastos),
  }));

  const totalQuery = `
    WITH totales AS (
      SELECT
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)  AS ingresos,
        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS gastos
      FROM bank_movement
      WHERE ${where.join(' AND ')}
    )
    SELECT
      COALESCE(ingresos, 0) AS ingresos,
      COALESCE(gastos, 0)   AS gastos,
      COALESCE(gastos, 0) - COALESCE(ingresos, 0) AS deficit,
      CASE 
        WHEN (COALESCE(ingresos,0) + COALESCE(gastos,0)) > 0 THEN 
          ROUND(COALESCE(ingresos,0) * 100.0 / (COALESCE(ingresos,0) + COALESCE(gastos,0)), 1)
        ELSE 0
      END AS "tasaPago"
    FROM totales;
  `;
  const totalRes = await db.query(totalQuery, params);
  const totals = totalRes.rows[0] || {};

  return {
    chart,
    totals: {
      ingresos: Number(totals.ingresos || 0),
      gastos: Number(totals.gastos || 0),
      deficit: Number(totals.deficit || 0),
      tasaPago: Number(totals.tasaPago || 0),
    },
  };
};

exports.getGastosPorCategoria = async ({ anio, mes, bankId }) => {
  const params = [anio, mes];
  let idx = 3;

  const where = [
    'bm.movement_date >= make_date($1, $2, 1)',
    `bm.movement_date <  (make_date($1, $2, 1) + INTERVAL '1 month')`,
    'bm.amount < 0',
  ];

  if (bankId) {
    where.push(`bm.bank_account_id = $${idx++}`);
    params.push(bankId);
  }

  const query = `
    SELECT 
      c.name AS nombre_categoria,
      SUM(-bm.amount) AS total
    FROM bank_movement bm
    JOIN movement_category mc ON mc.movement_id = bm.id
    JOIN category c           ON c.id = mc.category_id
    WHERE ${where.join(' AND ')}
    GROUP BY c.name
    ORDER BY total DESC;
  `;

  const r = await db.query(query, params);
  return r.rows.map(x => ({
    nombre_categoria: x.nombre_categoria,
    total: Number(x.total),
  }));
};

exports.getMovimientos = async ({ anio, bankId, categoriaId, tipo, limit = 500, offset = 0 }) => {
  const params = [];
  let idx = 1;

  let where = `WHERE EXTRACT(YEAR FROM m.movement_date) = $${idx++}`;
  params.push(anio);

  if (bankId) {
    where += ` AND m.bank_account_id = $${idx++}`;
    params.push(bankId);
  }

  if (categoriaId) {
    where += `
      AND EXISTS (
        SELECT 1
        FROM movement_category mc
        WHERE mc.movement_id = m.id
          AND mc.category_id = $${idx++}
      )
    `;
    params.push(categoriaId);
  }

  if (tipo === 'pagos') where += ` AND m.amount < 0`;
  if (tipo === 'cobros') where += ` AND m.amount > 0`;

  const sql = `
    SELECT
      m.id,
      m.bank_account_id,
      m.movement_date,
      m.description,
      m.reference1,
      m.reference2,
      m.amount,
      m.balance_after,
      c.id   AS categoria_id,
      c.name AS categoria
    FROM bank_movement m
    LEFT JOIN movement_category mc ON mc.movement_id = m.id
    LEFT JOIN category c           ON c.id = mc.category_id
    ${where}
    ORDER BY m.movement_date DESC, m.id DESC
    LIMIT $${idx++}
    OFFSET $${idx++}
  `;

  params.push(limit);
  params.push(offset);

  const r = await db.query(sql, params);
  return r.rows.map(x => ({
    id: x.id,
    bank_account_id: x.bank_account_id,
    movement_date: x.movement_date,
    description: x.description,
    reference1: x.reference1,
    reference2: x.reference2,
    amount: Number(x.amount),
    balance_after: Number(x.balance_after),
    categoria_id: x.categoria_id,
    categoria: x.categoria,
  }));
};

exports.getBancos = async () => {
  const r = await db.query(`
    SELECT id, name, bank_name, currency
    FROM bank_account
    ORDER BY id
  `);

  return r.rows.map(x => ({
    id: x.id,
    name: x.name || x.bank_name,
    bank_name: x.bank_name,
    currency: x.currency,
  }));
};
