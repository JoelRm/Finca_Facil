const db = require('../config/db');

exports.getFiltros = async (req, res) => {
  try {
    const anios = await db.query(
      'SELECT DISTINCT anio FROM fact_movimientos ORDER BY anio DESC'
    );

    const meses = await db.query(
      'SELECT DISTINCT mes FROM fact_movimientos ORDER BY mes'
    );

    const categorias = await db.query(
      `SELECT categoria_id, nombre_categoria
       FROM dim_categoria
       ORDER BY nombre_categoria`
    );

    res.json({
      anios: anios.rows.map(r => r.anio),
      meses: meses.rows.map(r => r.mes),
      categorias: categorias.rows
    });
  } catch (error) {
    console.error('ERROR FILTROS:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getKpis = async (req, res) => {
  const { anio, mes } = req.query;

  if (!anio) {
    return res.status(400).json({ error: 'anio es obligatorio' });
  }

  try {
    const ingresos = await db.query(
      `SELECT COALESCE(SUM(importe), 0) total
       FROM fact_movimientos
       WHERE importe > 0
         AND anio = $1
         AND ($2::int IS NULL OR mes = $2)`,
      [anio, mes || null]
    );

    const egresos = await db.query(
      `SELECT COALESCE(SUM(importe), 0) total
       FROM fact_movimientos
       WHERE importe < 0
         AND anio = $1
         AND ($2::int IS NULL OR mes = $2)`,
      [anio, mes || null]
    );

    const saldo = await db.query(
      `SELECT saldo
       FROM fact_movimientos
       WHERE anio = $1
         AND ($2::int IS NULL OR mes = $2)
       ORDER BY fecha DESC
       LIMIT 1`,
      [anio, mes || null]
    );

    res.json({
      ingresos: Number(ingresos.rows[0].total),
      egresos: Number(egresos.rows[0].total),
      saldo: Number(saldo.rows[0]?.saldo || 0)
    });
  } catch (error) {
    console.error('ERROR KPIS:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getCategorias = async (req, res) => {
  const { anio, mes } = req.query;

  if (!anio) {
    return res.status(400).json({ error: 'anio es obligatorio' });
  }

  try {
    const result = await db.query(
      `SELECT 
         c.categoria_id,
         c.nombre_categoria,
         SUM(f.importe) AS total
       FROM fact_movimientos f
       JOIN dim_categoria c ON f.categoria_id = c.categoria_id
       WHERE f.anio = $1
         AND ($2::int IS NULL OR f.mes = $2)
       GROUP BY c.categoria_id, c.nombre_categoria
       ORDER BY total DESC`,
      [anio, mes || null]
    );

    res.json(
      result.rows.map(r => ({
        categoria_id: r.categoria_id,
        nombre_categoria: r.nombre_categoria,
        total: Number(r.total)
      }))
    );
  } catch (error) {
    console.error('ERROR CATEGORIAS:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getEvolucion = async (req, res) => {
  const { anio } = req.query;

  if (!anio) {
    return res.status(400).json({ error: 'anio es obligatorio' });
  }

  try {
    // 1️⃣ Datos mensuales
    const mensualQuery = `
      SELECT 
        mes,
        SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) AS ingresos,
        SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END) AS gastos
      FROM fact_movimientos
      WHERE anio = $1
      GROUP BY mes
      ORDER BY mes
    `;
    const mensualResult = await db.query(mensualQuery, [anio]);

    const chart = mensualResult.rows.map(r => ({
      mes: r.mes,
      ingresos: Number(r.ingresos),
      gastos: Number(r.gastos)
    }));

    // 2️⃣ Totales anuales
    const totalQuery = `
      WITH totales AS (
        SELECT
          SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) AS ingresos,
          SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END) AS gastos
        FROM fact_movimientos
        WHERE anio = $1
      )
      SELECT
        ingresos,
        gastos,
        gastos - ingresos AS deficit,
        CASE 
          WHEN (ingresos + gastos) > 0 THEN ROUND(ingresos * 100.0 / (ingresos + gastos), 1)
          ELSE 0
        END AS "tasaPago"
      FROM totales;
    `;
    const totalResult = await db.query(totalQuery, [anio]);
    const totals = totalResult.rows[0];

    // 3️⃣ Devolver resultado
    res.json({
      chart,
      totals: {
        ingresos: Number(totals.ingresos),
        gastos: Number(totals.gastos),
        deficit: Number(totals.deficit),
        tasaPago: Number(totals.tasaPago) // ahora nunca será null
      }
    });

  } catch (error) {
    console.error('ERROR EVOLUCION:', error.message);
    res.status(500).json({ error: error.message });
  }
};



exports.getGastosPorCategoria = async (req, res) => {
  try {
    const { anio, mes } = req.query;

    const result = await db.query(`
      SELECT 
        c.nombre_categoria,
        SUM(f.importe) AS total
      FROM fact_movimientos f
      JOIN dim_categoria c ON c.categoria_id = f.categoria_id
      WHERE f.anio = $1
        AND f.mes = $2
        AND f.importe < 0
      GROUP BY c.nombre_categoria
      ORDER BY total ASC
    `, [anio, mes]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo gastos por categoría' });
  }
};
