const db = require('../repository/db.repository');
const { assertBankAccountInCommunity } = require('../repository/community.repository');

function applyFIFO(monthlyFee, payments) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    due: monthlyFee,
    paidApplied: 0,
    status: 'less',
  }));

  let monthIdx = 0;

  for (const p of payments) {
    let remaining = p.amount;

    while (remaining > 0 && monthIdx < 12) {
      const m = months[monthIdx];
      const need = m.due - m.paidApplied;

      if (need <= 0) { monthIdx++; continue; }

      const applied = Math.min(need, remaining);
      m.paidApplied += applied;
      remaining -= applied;

      if (m.paidApplied >= m.due) monthIdx++;
    }
  }

  for (const m of months) {
    if (m.paidApplied < m.due) m.status = 'less';
    else if (m.paidApplied === m.due) m.status = 'ok';
    else m.status = 'more';
  }

  const totalDue = monthlyFee * 12;
  const totalPaidApplied = months.reduce((a, x) => a + x.paidApplied, 0);
  const balance = totalPaidApplied - totalDue;

  return { months, totalDue, totalPaidApplied, balance };
}

exports.getMonthlyGrid = async ({ anio, bankId, communityId }) => {
  await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });
  const base = await db.query(`
    SELECT
      p.id AS property_id,
      p.code AS property_code,
      c.id AS client_id,
      c.full_name AS client_name,
      pf.monthly_fee
    FROM property p
    JOIN property_owner po ON po.property_id = p.id
    JOIN client c ON c.id = po.client_id
    JOIN LATERAL (
      SELECT monthly_fee
      FROM property_fee
      WHERE property_id = p.id
        AND start_date <= make_date($1, 12, 31)
        AND (end_date IS NULL OR end_date >= make_date($1, 1, 1))
      ORDER BY start_date DESC
      LIMIT 1
    ) pf ON true
    WHERE p.is_active = true
      AND c.is_active = true
      AND po.start_date <= make_date($1, 12, 31)
      AND (po.end_date IS NULL OR po.end_date >= make_date($1, 1, 1))
    ORDER BY p.code;
  `, [anio]);

  const pay = await db.query(`
    SELECT
      bmc.client_id,
      bm.movement_date::date AS movement_date,
      bm.amount::numeric(12,2) AS amount
    FROM bank_movement_client bmc
    JOIN bank_movement bm ON bm.id = bmc.movement_id
    WHERE bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
      AND upper(bm.description) LIKE 'TRANSFERENCIA%'
    ORDER BY bmc.client_id, bm.movement_date ASC, bm.id ASC;
  `, [bankId, anio]);

  const paymentsByClient = new Map();
  for (const r of pay.rows) {
    const arr = paymentsByClient.get(r.client_id) || [];
    arr.push({ date: r.movement_date, amount: Number(r.amount) });
    paymentsByClient.set(r.client_id, arr);
  }

  const rows = base.rows.map(x => {
    const monthlyFee = Number(x.monthly_fee);
    const payments = paymentsByClient.get(x.client_id) || [];
    const fifo = applyFIFO(monthlyFee, payments);

    return {
      clientId: x.client_id,
      clientName: x.client_name,
      propertyCode: x.property_code,
      monthlyFee,
      months: fifo.months,
      totalDue: fifo.totalDue,
      totalPaidApplied: fifo.totalPaidApplied,
      balance: fifo.balance,
    };
  });

  const un = await db.query(`
    SELECT
      EXTRACT(MONTH FROM bm.movement_date)::int AS mes,
      SUM(bm.amount)::numeric(12,2) AS total
    FROM bank_movement bm
    WHERE bm.bank_account_id = $1
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
      AND upper(bm.description) NOT LIKE 'TRANSFERENCIA%'
    GROUP BY mes
    ORDER BY mes;
  `, [bankId, anio]);

  const unidentifiedMonths = un.rows.map(r => ({ mes: r.mes, total: Number(r.total) }));
  const unidentifiedTotal = unidentifiedMonths.reduce((a, x) => a + x.total, 0);

  return {
    anio,
    bankId,
    rows,
    unidentified: {
      months: unidentifiedMonths,
      total: unidentifiedTotal,
    },
  };
};

function newMonthsArray(monthlyFee, hastaMes = 12) {
  const n = Math.min(12, Math.max(1, hastaMes));
  return Array.from({ length: n }, (_, i) => ({
    mes: i + 1,
    due: monthlyFee,
    paid: 0,
    status: 'less',
    paymentDates: [],
  }));
}

function applyFIFOWithDates(monthlyFee, payments, hastaMes = 12) {
  const months = newMonthsArray(monthlyFee, hastaMes);
  const dateSets = months.map(() => new Set());

  let monthIdx = 0;

  for (const p of payments) {
    let remaining = p.amount;

    while (remaining > 0 && monthIdx < months.length) {
      const m = months[monthIdx];
      const need = m.due - m.paid;

      if (need <= 0) { monthIdx++; continue; }

      const applied = Math.min(need, remaining);
      m.paid += applied;
      remaining -= applied;

      if (p.date) dateSets[monthIdx].add(p.date);

      if (m.paid >= m.due) monthIdx++;
    }
  }

  for (let i = 0; i < months.length; i++) {
    months[i].paymentDates = Array.from(dateSets[i]).sort();
  }

  for (const m of months) {
    if (m.paid < m.due) m.status = 'less';
    else if (m.paid === m.due) m.status = 'ok';
    else m.status = 'more';
  }

  const expected = monthlyFee * months.length;
  const paidApplied = months.reduce((a, x) => a + x.paid, 0);
  const mora = months.reduce((a, x) => a + Math.max(0, x.due - x.paid), 0);
  const moraMonths = months.reduce((a, x) => a + (x.paid < x.due ? 1 : 0), 0);

  return { months, totals: { expected, paidApplied, mora, moraMonths } };
}

exports.getCommunityOwnersMonthly = async ({ communityId, anio, hastaMes = 12 }) => {
  const base = await db.query(`
    SELECT
      p.id AS property_id,
      p.code AS property_code,
      c.id AS client_id,
      c.full_name AS client_name,
      pf.monthly_fee
    FROM property p
    JOIN property_owner po ON po.property_id = p.id
    JOIN client c ON c.id = po.client_id
    JOIN LATERAL (
      SELECT monthly_fee
      FROM property_fee
      WHERE property_id = p.id
        AND start_date <= make_date($1, 12, 31)
        AND (end_date IS NULL OR end_date >= make_date($1, 1, 1))
      ORDER BY start_date DESC
      LIMIT 1
    ) pf ON true
    WHERE p.is_active = true
      AND c.is_active = true
      AND p.community_id = $2
      AND po.start_date <= make_date($1, 12, 31)
      AND (po.end_date IS NULL OR po.end_date >= make_date($1, 1, 1))
    ORDER BY p.code;
  `, [anio, communityId]);

  const pay = await db.query(`
    SELECT
      bmc.client_id,
      bm.movement_date::date AS movement_date,
      bm.amount::numeric(12,2) AS amount
    FROM bank_movement_client bmc
    JOIN bank_movement bm ON bm.id = bmc.movement_id
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE ba.community_id = $2::bigint
      AND bm.movement_date >= make_date($1, 1, 1)
      AND bm.movement_date <  make_date($1 + 1, 1, 1)
      AND bm.amount > 0
    ORDER BY bmc.client_id, bm.movement_date ASC, bm.id ASC;
  `, [anio, communityId]);

  const paymentsByClient = new Map();
  for (const r of pay.rows) {
    const arr = paymentsByClient.get(r.client_id) || [];
    arr.push({ date: r.movement_date, amount: Number(r.amount) });
    paymentsByClient.set(r.client_id, arr);
  }

  const alloc = await db.query(`
    SELECT client_id, target_mes, SUM(amount)::numeric(12,2) AS amount
    FROM unidentified_allocation
    WHERE community_id = $1::bigint
      AND anio = $2::int
      AND amount > 0
    GROUP BY client_id, target_mes
    ORDER BY client_id, target_mes;
  `, [communityId, anio]);

  const allocByClient = new Map();
  for (const r of alloc.rows) {
    const client = Number(r.client_id);
    const mes = Number(r.target_mes);
    const amt = Number(r.amount);

    const m = allocByClient.get(client) || new Map();
    m.set(mes, Number(((m.get(mes) || 0) + amt).toFixed(2)));
    allocByClient.set(client, m);
  }

  const clients = base.rows.map(x => {
    const monthlyFee = Number(x.monthly_fee);
    const payments = paymentsByClient.get(x.client_id) || [];

    const fifo = applyFIFOWithDates(monthlyFee, payments, hastaMes);

    const extraMap = allocByClient.get(Number(x.client_id));
    if (extraMap) {
      for (const [mes, amt] of extraMap.entries()) {
        if (mes >= 1 && mes <= fifo.months.length) {
          const mm = fifo.months[mes - 1];
          mm.paid = Number((Number(mm.paid) + amt).toFixed(2));
          mm.paymentDates = Array.from(new Set([...(mm.paymentDates || []), `POOL-${anio}-${String(mes).padStart(2,'0')}`]));
        }
      }
    }

    for (const m of fifo.months) {
      if (m.paid < m.due) m.status = 'less';
      else if (m.paid === m.due) m.status = 'ok';
      else m.status = 'more';
    }

    const expected = monthlyFee * fifo.months.length;
    const paidApplied = fifo.months.reduce((a, mm) => a + Number(mm.paid || 0), 0);
    const mora = fifo.months.reduce((a, mm) => a + Math.max(0, Number(mm.due) - Number(mm.paid)), 0);
    const moraMonths = fifo.months.reduce((a, mm) => a + (Number(mm.paid) < Number(mm.due) ? 1 : 0), 0);

    return {
      clientId: x.client_id,
      clientName: x.client_name,
      property: { id: x.property_id, code: x.property_code },
      monthlyFee,
      months: fifo.months,
      totals: {
        expected: Number(expected.toFixed(2)),
        paidApplied: Number(paidApplied.toFixed(2)),
        mora: Number(mora.toFixed(2)),
        moraMonths
      }
    };
  });

  const pool = await db.query(`
    WITH base AS (
      SELECT
        EXTRACT(MONTH FROM bm.movement_date)::int AS mes,
        SUM(bm.amount)::numeric(12,2) AS base_total
      FROM bank_movement bm
      JOIN bank_account ba ON ba.id = bm.bank_account_id
      LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
      WHERE ba.community_id = $2::bigint
        AND bm.amount > 0
        AND bmc.movement_id IS NULL
        AND bm.movement_date >= make_date($1, 1, 1)
        AND bm.movement_date <  make_date($1 + 1, 1, 1)
      GROUP BY mes
    ),
    used AS (
      SELECT
        source_mes AS mes,
        SUM(amount)::numeric(12,2) AS used_total
      FROM unidentified_allocation
      WHERE community_id = $2::bigint
        AND anio = $1::int
        AND amount > 0
      GROUP BY source_mes
    )
    SELECT
      m.mes,
      COALESCE(b.base_total, 0)::numeric(12,2) AS total,
      COALESCE(u.used_total, 0)::numeric(12,2) AS used,
      (COALESCE(b.base_total, 0) - COALESCE(u.used_total, 0))::numeric(12,2) AS available
    FROM (SELECT generate_series(1,12)::int AS mes) m
    LEFT JOIN base b ON b.mes = m.mes
    LEFT JOIN used u ON u.mes = m.mes
    ORDER BY m.mes;
  `, [anio, communityId]);

  const months = pool.rows.map(r => ({
    mes: Number(r.mes),
    total: Number(Number(r.total).toFixed(2)),
    used: Number(Number(r.used).toFixed(2)),
    available: Number(Number(r.available).toFixed(2)),
    status: Number(r.available) > 0 ? 'ok' : 'less',
    paymentDates: []
  }));

  const totalAvailable = Number(months.reduce((a, x) => a + (x.available || 0), 0).toFixed(2));

  return {
    communityId,
    anio,
    hastaMes,
    clients,
    unidentified: {
      label: 'INGRESOS SIN IDENTIFICAR',
      months,
      total: totalAvailable
    }
  };
};

exports.getCommunityMorosidad = async ({ communityId, anio, hastaMes = 12, bankId }) => {
  const banksRes = await db.query(`
    SELECT id
    FROM bank_account
    WHERE community_id = $1
    ORDER BY id;
  `, [communityId]);

  const communityBankIds = banksRes.rows.map(r => Number(r.id));

  if (!communityBankIds.length) {
    const err = new Error('La comunidad no tiene cuentas bancarias registradas');
    err.statusCode = 400;
    throw err;
  }

  let usedBankIds = communityBankIds;
  if (bankId) {
    if (!communityBankIds.includes(Number(bankId))) {
      const err = new Error('bankId no pertenece a la comunidad indicada');
      err.statusCode = 400;
      throw err;
    }
    usedBankIds = [Number(bankId)];
  }

  const base = await db.query(`
    SELECT
      p.id AS property_id,
      c.id AS client_id,
      pf.monthly_fee
    FROM property p
    JOIN property_owner po ON po.property_id = p.id
    JOIN client c ON c.id = po.client_id
    JOIN LATERAL (
      SELECT monthly_fee
      FROM property_fee
      WHERE property_id = p.id
        AND start_date <= make_date($1, 12, 31)
        AND (end_date IS NULL OR end_date >= make_date($1, 1, 1))
      ORDER BY start_date DESC
      LIMIT 1
    ) pf ON true
    WHERE p.is_active = true
      AND c.is_active = true
      AND p.community_id = $2
      AND po.start_date <= make_date($1, 12, 31)
      AND (po.end_date IS NULL OR po.end_date >= make_date($1, 1, 1));
  `, [anio, communityId]);

  const pay = await db.query(`
    SELECT
      bmc.client_id,
      bm.movement_date::date AS movement_date,
      bm.amount::numeric(12,2) AS amount
    FROM bank_movement_client bmc
    JOIN bank_movement bm ON bm.id = bmc.movement_id
    WHERE bm.bank_account_id = ANY($1::bigint[])
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
    ORDER BY bmc.client_id, bm.movement_date ASC, bm.id ASC;
  `, [usedBankIds, anio]);

  const paymentsByClient = new Map();
  for (const r of pay.rows) {
    const arr = paymentsByClient.get(r.client_id) || [];
    arr.push({ date: r.movement_date, amount: Number(r.amount) });
    paymentsByClient.set(r.client_id, arr);
  }

  let expected = 0;
  let paidApplied = 0;
  let mora = 0;

  for (const row of base.rows) {
    const monthlyFee = Number(row.monthly_fee || 0);
    const payments = paymentsByClient.get(row.client_id) || [];
    const fifo = applyFIFOWithDates(monthlyFee, payments, hastaMes);

    expected += fifo.totals.expected;
    paidApplied += fifo.totals.paidApplied;
    mora += fifo.totals.mora;
  }

  const percent = expected > 0 ? Math.round((paidApplied * 100) / expected) : 0;

  return {
    communityId,
    anio,
    hastaMes,
    bankScope: bankId ? 'single' : 'all',
    usedBankIds,
    expected: Number(expected.toFixed(2)),
    paidApplied: Number(paidApplied.toFixed(2)),
    mora: Number(mora.toFixed(2)),
    percent
  };
};