const db = require('../repository/db.repository');
const { assertBankAccountInCommunity } = require('../repository/community.repository');

function buildYearWhere({ anio, mes, bankId, communityId }, alias = '') {
  const p = alias ? `${alias}.` : '';
  const where = [
    `${p}movement_date >= make_date($1, 1, 1)`,
    `${p}movement_date <  make_date($1 + 1, 1, 1)`,
  ];
  const params = [anio];
  let idx = 2;

  where.push(`ba.community_id = $${idx++}`);
  params.push(communityId);

  if (mes) {
    where.push(`EXTRACT(MONTH FROM ${p}movement_date) = $${idx++}`);
    params.push(mes);
  }

  if (bankId) {
    where.push(`${p}bank_account_id = $${idx++}`);
    params.push(bankId);
  }

  return { where, params };
}

exports.getFiltros = async ({ communityId }) => {
  const aniosRes = await db.query(
    `SELECT DISTINCT EXTRACT(YEAR FROM bm.movement_date)::int AS anio
     FROM bank_movement bm
     JOIN bank_account ba ON ba.id = bm.bank_account_id
     WHERE ba.community_id = $1
     ORDER BY anio DESC`,
    [communityId]
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
    WHERE ba.community_id = $1
    ORDER BY ba.alias;
  `, [communityId]);

  return {
    anios: aniosRes.rows.map(r => r.anio),
    bancos: bancosRes.rows,
  };
};

exports.getKpis = async ({ anio, mes, bankId, communityId }) => {
  if (bankId) await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });

  const { where, params } = buildYearWhere({ anio, mes, bankId, communityId }, 'bm');

  const kpiQuery = `
    SELECT
      COALESCE(SUM(CASE WHEN bm.amount > 0 THEN bm.amount ELSE 0 END), 0) AS ingresos,
      COALESCE(SUM(CASE WHEN bm.amount < 0 THEN -bm.amount ELSE 0 END), 0) AS egresos
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE ${where.join(' AND ')};
  `;
  const kpiRes = await db.query(kpiQuery, params);
  const kpi = kpiRes.rows[0] || { ingresos: 0, egresos: 0 };

  const saldoQuery = `
    SELECT bm.balance_after
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE ${where.join(' AND ')}
    ORDER BY bm.movement_date DESC, bm.id DESC
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

exports.getCategorias = async ({ anio, mes, bankId, communityId }) => {
  if (bankId) await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });

  const { where, params } = buildYearWhere({ anio, mes, bankId, communityId }, 'bm');
  where.push('bm.amount < 0');

  const query = `
    SELECT
      c.id            AS categoria_id,
      c.name          AS nombre_categoria,
      SUM(-bm.amount) AS total
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
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

exports.getEvolucion = async ({ anio, bankId, communityId }) => {
  if (bankId) await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });

  const { where, params } = buildYearWhere({ anio, bankId, communityId }, 'bm');

  const mensualQuery = `
    SELECT
      EXTRACT(MONTH FROM bm.movement_date)::int             AS mes,
      SUM(CASE WHEN bm.amount > 0 THEN bm.amount ELSE 0 END)   AS ingresos,
      SUM(CASE WHEN bm.amount < 0 THEN -bm.amount ELSE 0 END)  AS gastos
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
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
        SUM(CASE WHEN bm.amount > 0 THEN bm.amount ELSE 0 END)  AS ingresos,
        SUM(CASE WHEN bm.amount < 0 THEN -bm.amount ELSE 0 END) AS gastos
      FROM bank_movement bm
      JOIN bank_account ba ON ba.id = bm.bank_account_id
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

exports.getGastosPorCategoria = async ({ anio, mes, bankId, communityId }) => {
  if (bankId) await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });

  const params = [anio, mes, communityId];
  let idx = 4;

  const where = [
    'bm.movement_date >= make_date($1, $2, 1)',
    `bm.movement_date <  (make_date($1, $2, 1) + INTERVAL '1 month')`,
    'bm.amount < 0',
    'ba.community_id = $3',
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
    JOIN bank_account ba ON ba.id = bm.bank_account_id
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

exports.getMovimientos = async ({ anio, communityId, bankId, categoriaId, tipo, limit = 500, offset = 0 }) => {
  if (bankId) await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });

  const params = [];
  let idx = 1;

  let where = `
    WHERE EXTRACT(YEAR FROM m.movement_date) = $${idx++}
      AND ba.community_id = $${idx++}
  `;
  params.push(anio, communityId);

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
    JOIN bank_account ba ON ba.id = m.bank_account_id
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
    amount: Number(x.amount),
    balance_after: Number(x.balance_after),
    categoria_id: x.categoria_id,
    categoria: x.categoria,
  }));
};

exports.getBancos = async ({ communityId }) => {
  const r = await db.query(`
    SELECT id, name, bank_name, currency, alias, account_number
    FROM bank_account
    WHERE community_id = $1
    ORDER BY id
  `, [communityId]);

  return r.rows.map(x => ({
    id: x.id,
    name: x.name || x.bank_name,
    bank_name: x.bank_name,
    currency: x.currency,
    alias: x.alias,
    account_number: x.account_number
  }));
};
