const db = require('../repository/db.repository');

exports.autoAssign = async ({ anio, bankId }) => {
  const sql = `
    INSERT INTO bank_movement_client (movement_id, client_id, assigned_by, assigned_at)
    SELECT bm.id, m.client_id, 'auto', now()
    FROM bank_movement bm
    JOIN client_payment_matcher m
      ON m.is_active = true
     AND upper(bm.description) LIKE '%' || upper(m.match_text) || '%'
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE bmc.movement_id IS NULL
      AND bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
    RETURNING movement_id;
  `;

  const r = await db.query(sql, [bankId, anio]);

  const assigned = r.rowCount;

  const pending = await db.query(`
    SELECT COUNT(*)::int AS unassigned
    FROM bank_movement bm
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE bmc.movement_id IS NULL
      AND bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0;
  `, [bankId, anio]);

  return {
    assigned,
    unassigned: pending.rows[0]?.unassigned ?? 0,
  };
};

exports.assignManual = async ({ movementId, clientId }) => {
  const r = await db.query(`
    INSERT INTO bank_movement_client (movement_id, client_id, assigned_by, assigned_at)
    VALUES ($1, $2, 'manual', now())
    ON CONFLICT (movement_id)
    DO UPDATE SET client_id = EXCLUDED.client_id,
                  assigned_by = 'manual',
                  assigned_at = now()
    RETURNING movement_id, client_id;
  `, [movementId, clientId]);

  return { ok: true, assignment: r.rows[0] };
};

exports.getUnassigned = async ({ anio, bankId }) => {
  const rows = await db.query(`
    SELECT
      bm.id,
      bm.movement_date,
      bm.description,
      bm.reference1,
      bm.reference2,
      bm.amount
    FROM bank_movement bm
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE bmc.movement_id IS NULL
      AND bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
    ORDER BY bm.movement_date DESC, bm.id DESC;
  `, [bankId, anio]);

  const summary = await db.query(`
    SELECT
      EXTRACT(MONTH FROM bm.movement_date)::int AS mes,
      SUM(bm.amount)::numeric(12,2) AS total
    FROM bank_movement bm
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE bmc.movement_id IS NULL
      AND bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
    GROUP BY mes
    ORDER BY mes;
  `, [bankId, anio]);

  const total = summary.rows.reduce((acc, x) => acc + Number(x.total), 0);

  return {
    movements: rows.rows.map(x => ({
      id: x.id,
      movement_date: x.movement_date,
      description: x.description,
      reference1: x.reference1,
      reference2: x.reference2,
      amount: Number(x.amount),
    })),
    months: summary.rows.map(x => ({ mes: x.mes, total: Number(x.total) })),
    total,
  };
};

exports.matchPayment = async ({ movementId, clientId, communityId }) => {
  const mv = await db.query(`
    SELECT bm.id, bm.amount, bm.bank_account_id, ba.community_id
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE bm.id = $1;
  `, [movementId]);

  if (!mv.rows.length) {
    const err = new Error('Movimiento no existe');
    err.statusCode = 404;
    throw err;
  }

  const row = mv.rows[0];
  if (Number(row.amount) <= 0) {
    const err = new Error('Solo se pueden asignar ingresos (amount > 0)');
    err.statusCode = 400;
    throw err;
  }

  if (communityId && Number(row.community_id) !== Number(communityId)) {
    const err = new Error('El movimiento no pertenece a la comunidad enviada');
    err.statusCode = 400;
    throw err;
  }

  const cli = await db.query(`SELECT id FROM client WHERE id = $1`, [clientId]);
  if (!cli.rows.length) {
    const err = new Error('clientId no existe');
    err.statusCode = 404;
    throw err;
  }

  const ins = await db.query(`
    INSERT INTO bank_movement_client (movement_id, client_id, assigned_by, assigned_at)
    VALUES ($1, $2, 'manual', now())
    ON CONFLICT (movement_id) DO NOTHING
    RETURNING movement_id, client_id, assigned_by, assigned_at;
  `, [movementId, clientId]);

  if (!ins.rows.length) {
    return { ok: true, movementId, clientId, assignedBy: 'already_assigned' };
  }

  return { ok: true, ...ins.rows[0] };
};

exports.getUnassignedIncomesByCommunity = async ({ communityId, anio }) => {
  const r = await db.query(`
    SELECT
      bm.id,
      bm.bank_account_id,
      bm.movement_date,
      bm.description,
      bm.amount
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE ba.community_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
      AND bmc.movement_id IS NULL
    ORDER BY bm.movement_date DESC, bm.id DESC
    LIMIT 500;
  `, [communityId, anio]);

  return r.rows.map(x => ({
    id: x.id,
    bank_account_id: x.bank_account_id,
    movement_date: x.movement_date,
    description: x.description,
    amount: Number(x.amount),
  }));
};

function normKey(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extractTransferName(desc) {
  if (!desc) return null;
  const d = String(desc).trim();
  if (!/^TRANSFERENCIA/i.test(d)) return null;
  return d.replace(/^TRANSFERENCIA\s+/i, '').trim() || null;
}

exports.autoAssignTransfers = async ({ anio, bankId }) => {
  const mov = await db.query(`
    SELECT bm.id, bm.description
    FROM bank_movement bm
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE bmc.movement_id IS NULL
      AND bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
    ORDER BY bm.movement_date ASC, bm.id ASC;
  `, [bankId, anio]);

  let assigned = 0;
  let ignored = 0;
  let notFound = 0;

  for (const m of mov.rows) {
    const raw = extractTransferName(m.description);
    if (!raw) { ignored++; continue; }

    const key = normKey(raw);
    if (!key) { ignored++; continue; }

    const cli = await db.query(`SELECT id FROM client WHERE norm_key = $1 LIMIT 1`, [key]);
    if (!cli.rows.length) { notFound++; continue; }

    const clientId = cli.rows[0].id;

    const ins = await db.query(`
      INSERT INTO bank_movement_client (movement_id, client_id, assigned_by, assigned_at)
      VALUES ($1, $2, 'auto', now())
      ON CONFLICT (movement_id) DO NOTHING
      RETURNING movement_id;
    `, [m.id, clientId]);

    if (ins.rows.length) assigned++;
  }

  return {
    ok: true,
    scanned: mov.rowCount,
    assigned,
    ignored,
    notFound
  };
};