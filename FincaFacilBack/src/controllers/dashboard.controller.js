// controllers/dashboardController.js
const db = require('../config/db');

// helper para parsear int
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

/**
 * GET /api/filtros
 * - Años disponibles (según movement_date)
 * - Bancos (cuentas) activos de una comunidad
 * - Opcional: categorías (desde category)
 *
 * Respuesta:
 * {
 *   anios: [2024, 2023, ...],
 *   bancos: [{ id, nombre, alias, accountNumber }],
 *   categorias: [{ id, nombre }]
 * }
 */

exports.getFiltros = async (req, res) => {
  try {
    // AÑOS
    const anios = await db.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM movement_date)::int AS anio
       FROM bank_movement
       ORDER BY anio DESC`
    );

    // BANCOS + SALDO ACTUAL
    const bancos = await db.query(`
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

    res.json({
      anios: anios.rows.map(r => r.anio),
      bancos: bancos.rows,
    });
  } catch (error) {
    console.error('ERROR FILTROS:', error.message);
    res.status(500).json({ error: error.message });
  }
};


/**
 * GET /api/kpis?anio=2024&mes=1&bankId=2
 * KPIs:
 *  - ingresos (sum amount > 0)
 *  - egresos (sum |amount| where amount < 0)
 *  - saldo (último saldo del periodo)
 */
exports.getKpis = async (req, res) => {
  const anio = toInt(req.query.anio);
  const mes = toInt(req.query.mes);     // opcional
  const bankId = toInt(req.query.bankId); // opcional

  if (!anio) {
    return res.status(400).json({ error: 'anio es obligatorio' });
  }

  try {
    const where = [
      'movement_date >= make_date($1, 1, 1)',
      'movement_date <  make_date($1 + 1, 1, 1)',
    ];
    const params = [anio];
    let idx = 2;

    if (mes) {
      where.push(`EXTRACT(MONTH FROM movement_date) = $${idx}`);
      params.push(mes);
      idx++;
    }

    if (bankId) {
      where.push(`bank_account_id = $${idx}`);
      params.push(bankId);
      idx++;
    }

    // ingresos y egresos
    const kpiQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS egresos
      FROM bank_movement
      WHERE ${where.join(' AND ')};
    `;
    const kpiResult = await db.query(kpiQuery, params);
    const kpi = kpiResult.rows[0] || { ingresos: 0, egresos: 0 };

    // saldo (último balance_after del periodo)
    const saldoQuery = `
      SELECT balance_after
      FROM bank_movement
      WHERE ${where.join(' AND ')}
      ORDER BY movement_date DESC, id DESC
      LIMIT 1;
    `;
    const saldoResult = await db.query(saldoQuery, params);
    const saldoRow = saldoResult.rows[0];

    res.json({
      ingresos: Number(kpi.ingresos),
      egresos: Number(kpi.egresos),
      saldo: Number(saldoRow?.balance_after || 0),
    });
  } catch (error) {
    console.error('ERROR KPIS:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/categorias?anio=2024&mes=1&bankId=2
 * Para la dona: gastos por categoría
 *
 * Respuesta:
 * [
 *   { categoria_id, nombre_categoria, total }
 * ]
 */
exports.getCategorias = async (req, res) => {
  const anio = toInt(req.query.anio);
  const mes = toInt(req.query.mes);
  const bankId = toInt(req.query.bankId);

  if (!anio) {
    return res.status(400).json({ error: 'anio es obligatorio' });
  }

  try {
    const where = [
      'bm.movement_date >= make_date($1, 1, 1)',
      'bm.movement_date <  make_date($1 + 1, 1, 1)',
      'bm.amount < 0', // solo egresos
    ];
    const params = [anio];
    let idx = 2;

    if (mes) {
      where.push(`EXTRACT(MONTH FROM bm.movement_date) = $${idx}`);
      params.push(mes);
      idx++;
    }

    if (bankId) {
      where.push(`bm.bank_account_id = $${idx}`);
      params.push(bankId);
      idx++;
    }

    const query = `
      SELECT
        c.id                                 AS categoria_id,
        c.name                               AS nombre_categoria,
        SUM(-bm.amount)                      AS total
      FROM bank_movement bm
      JOIN movement_category mc ON mc.movement_id = bm.id
      JOIN category c           ON c.id = mc.category_id
      WHERE ${where.join(' AND ')}
      GROUP BY c.id, c.name
      ORDER BY total DESC;
    `;

    const result = await db.query(query, params);

    res.json(
      result.rows.map(r => ({
        categoria_id: r.categoria_id,
        nombre_categoria: r.nombre_categoria,
        total: Number(r.total),
      }))
    );
  } catch (error) {
    console.error('ERROR CATEGORIAS:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/evolucion?anio=2024&bankId=2
 * - chart: ingresos/gastos por mes (para el gráfico de barras)
 * - totals: ingresos, gastos, déficit, tasaPago
 *
 * Respuesta:
 * {
 *   chart: [{ mes, ingresos, gastos }],
 *   totals: { ingresos, gastos, deficit, tasaPago }
 * }
 */
exports.getEvolucion = async (req, res) => {
  const anio = toInt(req.query.anio);
  const bankId = toInt(req.query.bankId);

  if (!anio) {
    return res.status(400).json({ error: 'anio es obligatorio' });
  }

  try {
    const where = [
      'movement_date >= make_date($1, 1, 1)',
      'movement_date <  make_date($1 + 1, 1, 1)',
    ];
    const params = [anio];
    let idx = 2;

    if (bankId) {
      where.push(`bank_account_id = $${idx}`);
      params.push(bankId);
      idx++;
    }

    // 1) datos mensuales
    const mensualQuery = `
      SELECT
        EXTRACT(MONTH FROM movement_date)::int                        AS mes,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)             AS ingresos,
        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END)            AS gastos
      FROM bank_movement
      WHERE ${where.join(' AND ')}
      GROUP BY mes
      ORDER BY mes;
    `;
    const mensualResult = await db.query(mensualQuery, params);

    const chart = mensualResult.rows.map(r => ({
      mes: r.mes, // 1..12
      ingresos: Number(r.ingresos),
      gastos: Number(r.gastos),
    }));

    // 2) totales anuales
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
    const totalResult = await db.query(totalQuery, params);
    const totals = totalResult.rows[0];

    res.json({
      chart,
      totals: {
        ingresos: Number(totals.ingresos || 0),
        gastos: Number(totals.gastos || 0),
        deficit: Number(totals.deficit || 0),
        tasaPago: Number(totals.tasaPago || 0),
      },
    });
  } catch (error) {
    console.error('ERROR EVOLUCION:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/gastos-por-categoria?anio=2024&mes=1&bankId=2
 * Versión más específica (si quieres mantenerla),
 * solo egresos de un mes, agrupados por categoría.
 */
exports.getGastosPorCategoria = async (req, res) => {
  try {
    const anio = toInt(req.query.anio);
    const mes = toInt(req.query.mes);
    const bankId = toInt(req.query.bankId);

    if (!anio || !mes) {
      return res.status(400).json({ error: 'anio y mes son obligatorios' });
    }

    const where = [
      'bm.movement_date >= make_date($1, $2, 1)',
      'bm.movement_date <  (make_date($1, $2, 1) + INTERVAL \'1 month\')',
      'bm.amount < 0',
    ];
    const params = [anio, mes];
    let idx = 3;

    if (bankId) {
      where.push(`bm.bank_account_id = $${idx}`);
      params.push(bankId);
      idx++;
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

    const result = await db.query(query, params);
    res.json(
      result.rows.map(r => ({
        nombre_categoria: r.nombre_categoria,
        total: Number(r.total),
      }))
    );
  } catch (err) {
    console.error('ERROR GASTOS POR CATEGORIA:', err.message);
    res.status(500).json({ error: 'Error obteniendo gastos por categoría' });
  }
};

/**
 * GET /api/movimientos?bankId=1&anio=2024&mes=1&limit=10&offset=0
 * Devuelve los últimos movimientos de una cuenta bancaria.
 */

exports.getMovimientos = async (req, res) => {
  try {
    const {
      anio,
      bankId,
      categoriaId,
      tipo,          // 'pagos' | 'cobros' | undefined
      limit = 500,
      offset = 0,
    } = req.query;

    if (!anio) {
      return res.status(400).json({ error: 'anio es obligatorio' });
    }

    const params = [];
    let idx = 1;

    let where = `
      WHERE EXTRACT(YEAR FROM m.movement_date) = $${idx++}
    `;
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

    if (tipo === 'pagos') {
      where += ` AND m.amount < 0`;
    } else if (tipo === 'cobros') {
      where += ` AND m.amount > 0`;
    }

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
      LEFT JOIN movement_category mc
        ON mc.movement_id = m.id
      LEFT JOIN category c
        ON c.id = mc.category_id
      ${where}
      ORDER BY m.movement_date DESC, m.id DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
    `;

    params.push(limit);
    params.push(offset);

    const result = await db.query(sql, params);

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        bank_account_id: r.bank_account_id,
        movement_date: r.movement_date,
        description: r.description,
        reference1: r.reference1,
        reference2: r.reference2,
        amount: Number(r.amount),
        balance_after: Number(r.balance_after),
        categoria_id: r.categoria_id,
        categoria: r.categoria,
      }))
    );
  } catch (err) {
    console.error('ERROR MOVIMIENTOS:', err.message);
    res.status(500).json({ error: 'Error obteniendo movimientos' });
  }
};


exports.getBancos = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        name,
        bank_name,
        currency
      FROM bank_account
      ORDER BY id
    `);

    res.json(
      result.rows.map(r => ({
        id: r.id,
        name: r.name || r.bank_name,
        bank_name: r.bank_name,
        currency: r.currency
      }))
    );
  } catch (err) {
    console.error('ERROR BANCOS:', err.message);
    res.status(500).json({ error: 'Error obteniendo bancos' });
  }
};

