const db = require('../repository/db.repository');

function httpError(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

function assertMonth(m, name) {
  if (!Number.isInteger(m) || m < 1 || m > 12) throw httpError(`${name} debe estar entre 1 y 12`, 400);
}

async function assertCommunityExists(c, communityId) {
  const r = await c.query(`SELECT id FROM community WHERE id = $1::bigint LIMIT 1;`, [communityId]);
  if (!r.rows.length) throw httpError('communityId no existe', 404);
}

async function assertClientExists(c, clientId) {
  const r = await c.query(`SELECT id FROM client WHERE id = $1::bigint LIMIT 1;`, [clientId]);
  if (!r.rows.length) throw httpError('clientId no existe', 404);
}

async function lockBucket(c, { communityId, anio, sourceMes }) {
  const key =
    BigInt(communityId) * 1000000n +
    BigInt(anio) * 100n +
    BigInt(sourceMes);

  await c.query(`SELECT pg_advisory_xact_lock($1::bigint);`, [key.toString()]);
}

async function getBaseTotal(c, { communityId, anio, sourceMes }) {
  const r = await c.query(`
    SELECT COALESCE(SUM(bm.amount), 0)::numeric(12,2) AS total
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE ba.community_id = $1::bigint
      AND bm.amount > 0
      AND bmc.movement_id IS NULL
      AND bm.movement_date >= make_date($2::int, 1, 1)
      AND bm.movement_date <  make_date(($2::int) + 1, 1, 1)
      AND EXTRACT(MONTH FROM bm.movement_date)::int = $3::int;
  `, [communityId, anio, sourceMes]);

  return Number(r.rows[0]?.total || 0);
}

async function getUsedOther(c, { communityId, anio, sourceMes, targetMes, clientId }) {
  const r = await c.query(`
    SELECT COALESCE(SUM(amount), 0)::numeric(12,2) AS used
    FROM unidentified_allocation
    WHERE community_id = $1::bigint
      AND anio = $2::int
      AND source_mes = $3::int
      AND amount > 0
      AND NOT (target_mes = $4::int AND client_id = $5::bigint);
  `, [communityId, anio, sourceMes, targetMes, clientId]);

  return Number(r.rows[0]?.used || 0);
}

async function getCurrentCell(c, { communityId, anio, sourceMes, targetMes, clientId }) {
  const r = await c.query(`
    SELECT id, amount
    FROM unidentified_allocation
    WHERE community_id = $1::bigint
      AND anio = $2::int
      AND source_mes = $3::int
      AND target_mes = $4::int
      AND client_id = $5::bigint
    LIMIT 1
    FOR UPDATE;
  `, [communityId, anio, sourceMes, targetMes, clientId]);

  if (!r.rows.length) return { id: null, amount: 0 };
  return { id: Number(r.rows[0].id), amount: Number(r.rows[0].amount) };
}

function applyFIFO(monthlyFee, payments, hastaMes = 12) {
  const months = Array.from({ length: Math.min(12, Math.max(1, hastaMes)) }, (_, i) => ({
    mes: i + 1,
    due: monthlyFee,
    paid: 0
  }));

  let monthIdx = 0;

  for (const p of payments) {
    let remaining = Number(p.amount || 0);
    while (remaining > 0 && monthIdx < months.length) {
      const m = months[monthIdx];
      const need = m.due - m.paid;
      if (need <= 0) { monthIdx++; continue; }

      const applied = Math.min(need, remaining);
      m.paid = Number((m.paid + applied).toFixed(2));
      remaining = Number((remaining - applied).toFixed(2));

      if (m.paid >= m.due) monthIdx++;
    }
  }

  return months;
}

async function getMonthlyFeeForClient(c, { communityId, anio, clientId }) {
  const r = await c.query(`
    SELECT
      p.id AS property_id,
      pf.monthly_fee::numeric(12,2) AS monthly_fee
    FROM property_owner po
    JOIN property p ON p.id = po.property_id
    JOIN LATERAL (
      SELECT monthly_fee
      FROM property_fee
      WHERE property_id = p.id
        AND start_date <= make_date($2, 12, 31)
        AND (end_date IS NULL OR end_date >= make_date($2, 1, 1))
      ORDER BY start_date DESC
      LIMIT 1
    ) pf ON true
    WHERE p.community_id = $1::bigint
      AND po.client_id = $3::bigint
      AND p.is_active = true
      AND po.start_date <= make_date($2, 12, 31)
      AND (po.end_date IS NULL OR po.end_date >= make_date($2, 1, 1))
    ORDER BY p.id ASC
    LIMIT 1;
  `, [communityId, anio, clientId]);

  if (!r.rows.length) return null;

  return {
    propertyId: Number(r.rows[0].property_id),
    monthlyFee: Number(r.rows[0].monthly_fee)
  };
}

async function getRealPaymentsForClient(c, { communityId, anio, clientId }) {
  const r = await c.query(`
    SELECT bm.movement_date::date AS movement_date, bm.amount::numeric(12,2) AS amount
    FROM bank_movement_client bmc
    JOIN bank_movement bm ON bm.id = bmc.movement_id
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE ba.community_id = $1::bigint
      AND bmc.client_id = $2::bigint
      AND bm.amount > 0
      AND bm.movement_date >= make_date($3::int, 1, 1)
      AND bm.movement_date <  make_date(($3::int) + 1, 1, 1)
    ORDER BY bm.movement_date ASC, bm.id ASC;
  `, [communityId, clientId, anio]);

  return r.rows.map(x => ({ date: x.movement_date, amount: Number(x.amount) }));
}

async function getAllocationsByTargetMonth(c, { communityId, anio, clientId }) {
  const r = await c.query(`
    SELECT target_mes, COALESCE(SUM(amount),0)::numeric(12,2) AS total
    FROM unidentified_allocation
    WHERE community_id = $1::bigint
      AND anio = $2::int
      AND client_id = $3::bigint
      AND amount > 0
    GROUP BY target_mes
    ORDER BY target_mes;
  `, [communityId, anio, clientId]);

  const map = new Map();
  for (const row of r.rows) {
    map.set(Number(row.target_mes), Number(row.total));
  }
  return map;
}

async function assertNotOverpayMonth(c, { communityId, anio, clientId, targetMes, increase }) {
  const feeRow = await getMonthlyFeeForClient(c, { communityId, anio, clientId });
  if (!feeRow) {
    throw httpError('No se pudo determinar la cuota mensual del cliente (no tiene propiedad/fee vigente)', 400);
  }
  const monthlyFee = Number(feeRow.monthlyFee);

  const payments = await getRealPaymentsForClient(c, { communityId, anio, clientId });
  const months = applyFIFO(monthlyFee, payments, 12);

  const allocByMonth = await getAllocationsByTargetMonth(c, { communityId, anio, clientId });
  for (const [mes, amt] of allocByMonth.entries()) {
    if (mes >= 1 && mes <= months.length) {
      months[mes - 1].paid = Number((months[mes - 1].paid + amt).toFixed(2));
    }
  }

  const idx = targetMes - 1;
  const paidNow = Number(months[idx]?.paid || 0);
  const due = Number(months[idx]?.due || monthlyFee);

  if (paidNow >= due) {
    throw httpError(`El mes ${targetMes} ya está pagado (paid=${paidNow}, due=${due}). No se puede agregar más.`, 400);
  }

  const remaining = Number((due - paidNow).toFixed(2));
  if (Number(increase) > remaining) {
    throw httpError(
      `El mes ${targetMes} solo permite agregar hasta ${remaining}. Intentaste agregar ${increase}. (paid=${paidNow}, due=${due})`,
      400
    );
  }

  return { ok: true, paidNow, due, remaining };
}

exports.allocateUnidentified = async ({
  communityId,
  anio,
  sourceMes,
  targetMes,
  clientId,
  delta,
  amount,
  note = null,
  actor = 'manual'
}) => {
  assertMonth(sourceMes, 'sourceMes');
  assertMonth(targetMes, 'targetMes');

  const hasDelta = delta !== undefined && delta !== null;
  const hasAmount = amount !== undefined && amount !== null;

  if (!hasDelta && !hasAmount) throw httpError('Debes enviar delta o amount', 400);
  if (hasDelta && (!Number.isFinite(Number(delta)) || Number(delta) <= 0)) throw httpError('delta debe ser número > 0', 400);
  if (hasAmount && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) throw httpError('amount inválido', 400);

  return db.tx(async (c) => {
    await assertCommunityExists(c, communityId);
    await assertClientExists(c, clientId);

    await lockBucket(c, { communityId, anio, sourceMes });

    const cur = await getCurrentCell(c, { communityId, anio, sourceMes, targetMes, clientId });
    const currentAmount = Number(cur.amount || 0);

    let newAmount;
    if (hasDelta) newAmount = Number((currentAmount + Number(delta)).toFixed(2));
    else newAmount = Number(Number(amount).toFixed(2));

    if (newAmount === 0) {
      const del = await c.query(`
        DELETE FROM unidentified_allocation
        WHERE community_id = $1::bigint
          AND anio = $2::int
          AND source_mes = $3::int
          AND target_mes = $4::int
          AND client_id = $5::bigint
        RETURNING id;
      `, [communityId, anio, sourceMes, targetMes, clientId]);

      return {
        ok: true,
        action: del.rows.length ? 'deleted' : 'noop',
        previousAmount: currentAmount,
        newAmount: 0
      };
    }

    const increase = Number((newAmount - currentAmount).toFixed(2));

    if (increase <= 0) {
      return { ok: true, action: 'noop', previousAmount: currentAmount, newAmount };
    }

    await assertNotOverpayMonth(c, { communityId, anio, clientId, targetMes, increase });

    const baseTotal = await getBaseTotal(c, { communityId, anio, sourceMes });
    const usedOther = await getUsedOther(c, { communityId, anio, sourceMes, targetMes, clientId });

    const availableForThisCell = Number((baseTotal - usedOther - currentAmount).toFixed(2));

    if (increase > availableForThisCell) {
      throw httpError(
        `No hay suficiente pool en mes ${sourceMes}. Disponible para aumentar: ${availableForThisCell}`,
        400
      );
    }

    const up = await c.query(`
      INSERT INTO unidentified_allocation (
        community_id, anio, source_mes, target_mes, client_id,
        amount, note, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6::numeric(12,2),$7,$8)
      ON CONFLICT (community_id, anio, source_mes, target_mes, client_id)
      DO UPDATE SET
        amount = EXCLUDED.amount,
        note = EXCLUDED.note,
        updated_at = now()
      RETURNING
        id, community_id, anio, source_mes, target_mes, client_id, amount, note, created_by, created_at, updated_at;
    `, [communityId, anio, sourceMes, targetMes, clientId, newAmount, note, actor]);

    return {
      ok: true,
      action: hasDelta ? 'added' : 'set',
      previousAmount: currentAmount,
      increase,
      newAmount,
      allocation: up.rows[0],
      pool: {
        sourceMes,
        baseTotal,
        usedOther,
        availableForThisCell,
        availableAfter: Number((availableForThisCell - increase).toFixed(2))
      }
    };
  });
};