const db = require('../repository/db.repository');

function normKey(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

async function ensureUser(c, email) {
  const e = String(email || '').trim().toLowerCase();
  const fullName = e;

  const r = await c.query(`
    INSERT INTO app_user (email, full_name, is_active, created_at)
    VALUES ($1::varchar, $2::text, true, now())
    ON CONFLICT (email) DO UPDATE
      SET is_active = true,
          full_name = EXCLUDED.full_name
    RETURNING id, email, full_name;
  `, [e, fullName]);

  return r.rows[0];
}

async function assertUserBelongsToCommunity(c, { userId, communityId }) {
  const r = await c.query(`
    SELECT cm.role, c.name
    FROM community_member cm
    JOIN community c ON c.id = cm.community_id
    WHERE cm.user_id = $1::bigint AND cm.community_id = $2::bigint
    LIMIT 1;
  `, [userId, communityId]);

  if (!r.rows.length) {
    const err = new Error('El usuario no pertenece a esta comunidad');
    err.statusCode = 403;
    throw err;
  }

  return { role: r.rows[0].role, communityName: r.rows[0].name };
}

async function assertCommunityExists(c, communityId) {
  const r = await c.query(`
    SELECT id, name, code, bank_id
    FROM community
    WHERE id = $1::bigint
  `, [communityId]);

  if (!r.rows.length) {
    const err = new Error('communityId no existe');
    err.statusCode = 404;
    throw err;
  }
  return r.rows[0];
}

async function assertBankExists(c, bankId) {
  const r = await c.query(`
    SELECT id, name
    FROM bank
    WHERE id = $1::bigint AND is_active = true
  `, [bankId]);

  if (!r.rows.length) {
    const err = new Error('bankId no existe o está inactivo');
    err.statusCode = 400;
    throw err;
  }
  return r.rows[0];
}

async function setCommunityBank(c, { communityId, bankId }) {
  const r = await c.query(`
    UPDATE community
    SET bank_id = $2::bigint
    WHERE id = $1::bigint
    RETURNING id, name, code, bank_id;
  `, [communityId, bankId]);

  return r.rows[0];
}

async function ensureBankAccounts(c, { communityId, bankName = 'BANCO', currency = 'PEN' }) {
  const defaults = [
    { alias: 'CUOTAS',  account_number: `000-${communityId}-1`, bank_name: bankName },
    { alias: 'GASTOS',  account_number: `000-${communityId}-2`, bank_name: bankName },
    { alias: 'RESERVA', account_number: `000-${communityId}-3`, bank_name: bankName },
  ];

  const out = [];
  for (const a of defaults) {
    const r = await c.query(`
      INSERT INTO bank_account (community_id, alias, bank_name, account_number, currency, created_at, is_active)
      VALUES ($1::bigint, $2::text, $3::text, $4::text, $5::text, now(), true)
      ON CONFLICT (community_id, alias) DO UPDATE
        SET bank_name = EXCLUDED.bank_name,
            account_number = EXCLUDED.account_number,
            currency = EXCLUDED.currency,
            is_active = true
      RETURNING id, community_id, alias, bank_name, account_number, currency, is_active;
    `, [communityId, a.alias, a.bank_name, a.account_number, currency]);

    out.push(r.rows[0]);
  }

  return out;
}

function propertyCodeForDb(communityId, rawCode) {
  const clean = String(rawCode || '').trim();
  return `C${communityId}-${clean}`;
}

async function ensureClientsPropertiesOwnersFees(c, { communityId }) {
  const demo = [
    { propertyCode: 'A-101', owner: 'JUAN PEREZ',   fee: 250 },
    { propertyCode: 'A-102', owner: 'MARIA LOPEZ',  fee: 250 },
    { propertyCode: 'A-103', owner: 'CARLOS DIAZ',  fee: 250 },
    { propertyCode: 'B-201', owner: 'ANA TORRES',   fee: 300 },
    { propertyCode: 'B-202', owner: 'LUIS RAMIREZ', fee: 300 },
  ];

  const created = { clients: 0, properties: 0, fees: 0, owners: 0, matchers: 0 };

  for (const d of demo) {
    const fullName = d.owner.trim();
    const key = normKey(fullName);

    const cli = await c.query(`
      INSERT INTO client (full_name, norm_key, is_active, created_at)
      VALUES ($1::text, $2::text, true, now())
      ON CONFLICT (norm_key) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            is_active = true
      RETURNING id;
    `, [fullName, key]);

    const clientId = Number(cli.rows[0].id);
    created.clients++;

    // property
    let prop = await c.query(`
      SELECT id
      FROM property
      WHERE community_id = $1::bigint AND code = $2::text
      LIMIT 1;
    `, [communityId, d.propertyCode]);

    let propertyId;

    if (prop.rows.length) {
      propertyId = Number(prop.rows[0].id);
      await c.query(`
        UPDATE property SET is_active = true
        WHERE id = $1::bigint;
      `, [propertyId]);
    } else {
      const ins = await c.query(`
        INSERT INTO property (community_id, code, note, is_active, created_at)
        VALUES ($1::bigint, $2::text, NULL, true, now())
        RETURNING id;
      `, [communityId, d.propertyCode]);

      propertyId = Number(ins.rows[0].id);
    }
    created.properties++;

    // fee
    const feeCheck = await c.query(`
      SELECT id, monthly_fee
      FROM property_fee
      WHERE property_id = $1::bigint AND end_date IS NULL
      ORDER BY start_date DESC
      LIMIT 1;
    `, [propertyId]);

    if (!feeCheck.rows.length || Number(feeCheck.rows[0].monthly_fee) !== Number(d.fee)) {
      await c.query(`
        UPDATE property_fee
        SET end_date = CURRENT_DATE
        WHERE property_id = $1::bigint AND end_date IS NULL;
      `, [propertyId]);

      await c.query(`
        INSERT INTO property_fee (property_id, monthly_fee, start_date, end_date)
        VALUES ($1::bigint, $2::numeric(12,2), CURRENT_DATE, NULL);
      `, [propertyId, d.fee]);

      created.fees++;
    }

    // owner
    const own = await c.query(`
      SELECT id, client_id
      FROM property_owner
      WHERE property_id = $1::bigint AND end_date IS NULL
      ORDER BY start_date DESC
      LIMIT 1;
    `, [propertyId]);

    if (!own.rows.length || Number(own.rows[0].client_id) !== clientId) {
      await c.query(`
        UPDATE property_owner
        SET end_date = CURRENT_DATE
        WHERE property_id = $1::bigint AND end_date IS NULL;
      `, [propertyId]);

      await c.query(`
        INSERT INTO property_owner (property_id, client_id, start_date, end_date)
        VALUES ($1::bigint, $2::bigint, CURRENT_DATE, NULL);
      `, [propertyId, clientId]);

      created.owners++;
    }

    const insMatcher = await c.query(`
      INSERT INTO client_payment_matcher (client_id, match_text, match_mode, is_active, created_at)
      VALUES ($1::bigint, $2::text, 'ILIKE', true, now())
      ON CONFLICT ON CONSTRAINT uq_client_matcher_client_text DO NOTHING
      RETURNING id;
    `, [clientId, fullName]);

    if (insMatcher.rows.length) created.matchers++;
  }

  return created;
}

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function makeRef({ communityId, bankAccountId, clientId, year, month, i, kind }) {
  const rnd = Math.floor(Math.random() * 1e9);
  return `DEMO-${kind}-C${communityId}-BA${bankAccountId}-CL${clientId || 0}-${year}${String(month).padStart(2,'0')}-${i}-${rnd}`;
}

/**
 * ✅ Movimientos demo:
 * - crea ingresos identificados + bank_movement_client
 * - crea egresos (amount negativo)
 * ✅ CAMBIO: recibe anio para que SIEMPRE coincida con lo que consulta el dashboard
 */
async function seedMovements(c, { accounts, communityId, anio = null }) {
  const owners = await c.query(`
    SELECT DISTINCT cl.id AS client_id, cl.full_name
    FROM property p
    JOIN property_owner po ON po.property_id = p.id AND po.end_date IS NULL
    JOIN client cl ON cl.id = po.client_id
    WHERE p.community_id = $1::bigint
    ORDER BY cl.id;
  `, [communityId]);

  const cuotasAcc = accounts.find(a => a.alias === 'CUOTAS');
  const gastosAcc = accounts.find(a => a.alias === 'GASTOS');

  if (!cuotasAcc || !gastosAcc) {
    const err = new Error('No se encontraron cuentas CUOTAS y/o GASTOS');
    err.statusCode = 500;
    throw err;
  }

  const inserted = { incomes: 0, expenses: 0, linked: 0 };
  const year = anio || new Date().getUTCFullYear(); // ✅ AQUÍ EL CAMBIO
  const months = [1,2,3,4,5,6];

  for (const row of owners.rows) {
    const name = row.full_name;
    const clientId = Number(row.client_id);

    for (let mi = 0; mi < months.length; mi++) {
      const m = months[mi];
      if (Math.random() < 0.2) continue;

      const amount = randomBetween(200, 350);
      const day = Math.min(25, 5 + Math.floor(Math.random() * 20));
      const date = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const reference1 = makeRef({
        communityId,
        bankAccountId: cuotasAcc.id,
        clientId,
        year,
        month: m,
        i: mi,
        kind: 'IN'
      });

      const r = await c.query(`
        INSERT INTO bank_movement (
          bank_account_id, movement_date, description,
          reference1, reference2, amount, balance_after
        )
        VALUES ($1::bigint, $2::date, $3::text, $4::text, NULL, $5::numeric(12,2), 0::numeric(12,2))
        RETURNING id;
      `, [
        cuotasAcc.id,
        date,
        `TRANSFERENCIA ${name}`,
        reference1,
        amount
      ]);

      inserted.incomes++;
      const movementId = Number(r.rows[0].id);

      const link = await c.query(`
        INSERT INTO bank_movement_client (movement_id, client_id, assigned_by, assigned_at)
        VALUES ($1::bigint, $2::bigint, 'seed', now())
        ON CONFLICT (movement_id) DO NOTHING
        RETURNING movement_id;
      `, [movementId, clientId]);

      if (link.rows.length) inserted.linked++;
    }
  }

  const expenseTemplates = [
    'PAGO LIMPIEZA',
    'PAGO SEGURIDAD',
    'MANTENIMIENTO ASCENSOR',
    'SERVICIO AGUA',
    'SERVICIO LUZ COMUN',
  ];

  for (let i = 0; i < 30; i++) {
    const m = 1 + Math.floor(Math.random() * 6);
    const day = 1 + Math.floor(Math.random() * 28);
    const date = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const desc = expenseTemplates[Math.floor(Math.random() * expenseTemplates.length)];
    const amount = -randomBetween(50, 900);

    const reference1 = makeRef({
      communityId,
      bankAccountId: gastosAcc.id,
      clientId: null,
      year,
      month: m,
      i,
      kind: 'OUT'
    });

    await c.query(`
      INSERT INTO bank_movement (
        bank_account_id, movement_date, description,
        reference1, reference2, amount, balance_after
      )
      VALUES ($1::bigint, $2::date, $3::text, $4::text, NULL, $5::numeric(12,2), 0::numeric(12,2))
      RETURNING id;
    `, [gastosAcc.id, date, desc, reference1, amount]);

    inserted.expenses++;
  }

  return { inserted };
}

async function seedUnidentifiedIncomes(c, { accounts, communityId, anio = null }) {
  const cuotasAcc = accounts.find(a => a.alias === 'CUOTAS');
  if (!cuotasAcc) {
    const err = new Error('No existe cuenta CUOTAS para sembrar sin identificar');
    err.statusCode = 500;
    throw err;
  }

  const year = anio || new Date().getUTCFullYear();
  const inserted = { unidentified: 0 };

  for (let mes = 1; mes <= 12; mes++) {
    const n = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < n; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      const date = `${year}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const amount = randomBetween(50, 400);

      await c.query(`
        INSERT INTO bank_movement (
          bank_account_id, movement_date, description,
          reference1, reference2, amount, balance_after
        )
        VALUES ($1::bigint, $2::date, $3::text, NULL, NULL, $4::numeric(12,2), 0::numeric(12,2))
        RETURNING id;
      `, [
        cuotasAcc.id,
        date,
        'INGRESO SIN IDENTIFICAR',
        amount
      ]);

      inserted.unidentified++;
    }
  }

  return inserted;
}

async function buildUnidentifiedPoolMonths(c, { communityId, anio }) {
  const totals = await c.query(`
    SELECT
      EXTRACT(MONTH FROM bm.movement_date)::int AS mes,
      SUM(bm.amount)::numeric(12,2) AS total
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    LEFT JOIN bank_movement_client bmc ON bmc.movement_id = bm.id
    WHERE ba.community_id = $1::bigint
      AND bm.movement_date >= make_date($2::int, 1, 1)
      AND bm.movement_date <  make_date(($2::int) + 1, 1, 1)
      AND bm.amount > 0
      AND bmc.movement_id IS NULL
    GROUP BY mes
    ORDER BY mes;
  `, [communityId, anio]);

  const used = await c.query(`
    SELECT mes, SUM(amount_applied)::numeric(12,2) AS used
    FROM unidentified_income_allocation
    WHERE community_id = $1::bigint AND anio = $2::int
    GROUP BY mes
    ORDER BY mes;
  `, [communityId, anio]);

  const mapTotal = new Map(totals.rows.map(r => [Number(r.mes), Number(r.total)]));
  const mapUsed = new Map(used.rows.map(r => [Number(r.mes), Number(r.used)]));

  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const totalM = mapTotal.get(mes) || 0;
    const usedM = mapUsed.get(mes) || 0;
    const available = Number((totalM - usedM).toFixed(2));

    return {
      mes,
      total: Number(totalM.toFixed(2)),
      used: Number(usedM.toFixed(2)),
      paid: available,
      status: available > 0 ? 'ok' : 'less',
      paymentDates: []
    };
  });
}

async function autoAssignMovementCategories(c, { communityId }) {
  const cats = await c.query(`
    SELECT id, name, nature
    FROM category
    WHERE is_active = true
  `);

  const byName = new Map(
    cats.rows.map(r => [String(r.name).trim().toUpperCase(), Number(r.id)])
  );

  const CAT_OTROS = byName.get('OTROS') || null;
  const CAT_TRANSFERENCIAS = byName.get('TRANSFERENCIAS') || null;

  await c.query(`
    INSERT INTO movement_category (movement_id, category_id, source, created_at)
    SELECT DISTINCT ON (bm.id)
      bm.id AS movement_id,
      ck.category_id,
      'auto'::category_source AS source,
      now() AS created_at
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    JOIN category_keyword ck
      ON ck.is_active = true
     AND ck.match_type = 'CONTAINS'
     AND bm.description ILIKE ('%' || ck.pattern || '%')
    LEFT JOIN movement_category mc ON mc.movement_id = bm.id
    WHERE ba.community_id = $1::bigint
      AND mc.movement_id IS NULL
    ORDER BY bm.id, ck.id ASC;
  `, [communityId]);

  if (CAT_OTROS) {
    await c.query(`
      INSERT INTO movement_category (movement_id, category_id, source, created_at)
      SELECT bm.id, $2::bigint, 'auto'::category_source, now()
      FROM bank_movement bm
      JOIN bank_account ba ON ba.id = bm.bank_account_id
      LEFT JOIN movement_category mc ON mc.movement_id = bm.id
      WHERE ba.community_id = $1::bigint
        AND mc.movement_id IS NULL
        AND bm.amount < 0;
    `, [communityId, CAT_OTROS]);
  }

  if (CAT_TRANSFERENCIAS) {
    await c.query(`
      INSERT INTO movement_category (movement_id, category_id, source, created_at)
      SELECT bm.id, $2::bigint, 'auto'::category_source, now()
      FROM bank_movement bm
      JOIN bank_account ba ON ba.id = bm.bank_account_id
      LEFT JOIN movement_category mc ON mc.movement_id = bm.id
      WHERE ba.community_id = $1::bigint
        AND mc.movement_id IS NULL
        AND bm.amount > 0;
    `, [communityId, CAT_TRANSFERENCIAS]);
  }

  const r = await c.query(`
    SELECT COUNT(*)::int AS total
    FROM movement_category mc
    JOIN bank_movement bm ON bm.id = mc.movement_id
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE ba.community_id = $1::bigint;
  `, [communityId]);

  return { movementCategories: r.rows[0]?.total || 0 };
}

exports.assignBankAndSeedDemo = async ({ email, communityId, bankId }) => {
  return db.tx(async (c) => {
    const user = await ensureUser(c, email);

    const commBefore = await assertCommunityExists(c, communityId);
    const membership = await assertUserBelongsToCommunity(c, { userId: user.id, communityId });
    const bank = await assertBankExists(c, bankId);
    const comm = await setCommunityBank(c, { communityId, bankId });

    const accounts = await ensureBankAccounts(c, {
      communityId: comm.id,
      bankName: bank.name,
      currency: 'PEN'
    });

    if (!accounts.length) {
      const err = new Error('No se pudieron crear cuentas bancarias para la comunidad');
      err.statusCode = 500;
      throw err;
    }

    const created = await ensureClientsPropertiesOwnersFees(c, { communityId: comm.id });

    // ✅ AQUÍ: anio único para todo
    const anio = new Date().getUTCFullYear();

    const { inserted } = await seedMovements(c, { accounts, communityId: comm.id, anio });
    const unidentifiedSeed = await seedUnidentifiedIncomes(c, { accounts, communityId: comm.id, anio });

    const categorized = await autoAssignMovementCategories(c, { communityId: comm.id });

    const poolMonths = await buildUnidentifiedPoolMonths(c, { communityId: comm.id, anio });

    return {
      ok: true,
      user,
      community: { ...comm, previous_bank_id: commBefore.bank_id },
      membership,
      bank,
      bankAccounts: accounts,
      created,
      movements: { ...inserted, ...unidentifiedSeed },
      categorized,
      unidentifiedPool: {
        anio,
        months: poolMonths,
        total: Number(poolMonths.reduce((a, x) => a + (x.paid || 0), 0).toFixed(2))
      }
    };
  });
};