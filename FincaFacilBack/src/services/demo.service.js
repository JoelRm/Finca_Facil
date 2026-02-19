const db = require('../repository/db.repository');

function normKey(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

async function ensureUser(c, email) {
  const r = await c.query(`
    INSERT INTO app_user (email, is_active, created_at)
    VALUES ($1, true, now())
    ON CONFLICT (email) DO UPDATE SET is_active = true
    RETURNING id, email;
  `, [email]);
  return r.rows[0];
}

async function upsertCommunityAndAssignBank(c, { name, code, bankId }) {
  // upsert community
  const comm = await c.query(`
    INSERT INTO community (name, code, bank_id, created_at)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          bank_id = EXCLUDED.bank_id
    RETURNING id, name, code, bank_id;
  `, [name, code, bankId]);

  // validar bank existe
  const b = await c.query(`SELECT id FROM bank WHERE id = $1 AND is_active = true`, [bankId]);
  if (!b.rows.length) {
    const err = new Error('bankId no existe o está inactivo');
    err.statusCode = 400;
    throw err;
  }

  return comm.rows[0];
}

async function ensureMembershipOwner(c, { userId, communityId }) {
  await c.query(`
    INSERT INTO community_member (user_id, community_id, role, joined_at)
    VALUES ($1, $2, 'owner', now())
    ON CONFLICT (user_id, community_id) DO UPDATE
      SET role = 'owner'
  `, [userId, communityId]);
}

async function ensureBankAccounts(c, { communityId, bankName = 'BANCO', currency = 'PEN' }) {
  const defaults = [
    { alias: 'CUOTAS', account_number: `000-${communityId}-1`, bank_name: bankName },
    { alias: 'GASTOS', account_number: `000-${communityId}-2`, bank_name: bankName },
    { alias: 'RESERVA', account_number: `000-${communityId}-3`, bank_name: bankName },
  ];

  const out = [];
  for (const a of defaults) {
    const r = await c.query(`
      INSERT INTO bank_account (community_id, alias, bank_name, account_number, currency, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (community_id, alias) DO UPDATE
        SET bank_name = EXCLUDED.bank_name,
            account_number = EXCLUDED.account_number,
            currency = EXCLUDED.currency
      RETURNING id, community_id, alias, bank_name, account_number, currency;
    `, [communityId, a.alias, a.bank_name, a.account_number, currency]);

    out.push(r.rows[0]);
  }
  return out;
}

async function ensureClientsPropertiesOwnersFees(c, { communityId }) {
  // dataset demo (puedes ajustar cantidad)
  const demo = [
    { propertyCode: 'A-101', owner: 'JUAN PEREZ', fee: 250 },
    { propertyCode: 'A-102', owner: 'MARIA LOPEZ', fee: 250 },
    { propertyCode: 'A-103', owner: 'CARLOS DIAZ', fee: 250 },
    { propertyCode: 'B-201', owner: 'ANA TORRES', fee: 300 },
    { propertyCode: 'B-202', owner: 'LUIS RAMIREZ', fee: 300 },
  ];

  const created = { clients: 0, properties: 0, owners: 0, fees: 0, matchers: 0 };

  for (const d of demo) {
    const fullName = d.owner.trim();
    const key = normKey(fullName);

    // client upsert por norm_key
    const cli = await c.query(`
      INSERT INTO client (full_name, norm_key, is_active, created_at)
      VALUES ($1, $2, true, now())
      ON CONFLICT (norm_key) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            is_active = true
      RETURNING id;
    `, [fullName, key]);
    const clientId = Number(cli.rows[0].id);

    // property upsert por community+code
    const prop = await c.query(`
      INSERT INTO property (community_id, code, note, is_active, created_at)
      VALUES ($1, $2, null, true, now())
      ON CONFLICT (community_id, code) DO UPDATE
        SET is_active = true
      RETURNING id;
    `, [communityId, d.propertyCode]);
    const propertyId = Number(prop.rows[0].id);

    // fee: cierra anterior y crea nueva solo si no existe una igual activa
    // (simple: si hay fee activa igual, no insertamos)
    const feeCheck = await c.query(`
      SELECT id, monthly_fee
      FROM property_fee
      WHERE property_id = $1 AND end_date IS NULL
      ORDER BY start_date DESC
      LIMIT 1;
    `, [propertyId]);

    if (!feeCheck.rows.length || Number(feeCheck.rows[0].monthly_fee) !== Number(d.fee)) {
      await c.query(`
        UPDATE property_fee
        SET end_date = CURRENT_DATE
        WHERE property_id = $1 AND end_date IS NULL;
      `, [propertyId]);

      await c.query(`
        INSERT INTO property_fee (property_id, monthly_fee, start_date, end_date)
        VALUES ($1, $2::numeric(12,2), CURRENT_DATE, NULL);
      `, [propertyId, d.fee]);

      created.fees++;
    }

    // owner: cerrar owner activo si distinto y crear
    const own = await c.query(`
      SELECT id, client_id
      FROM property_owner
      WHERE property_id = $1 AND end_date IS NULL
      ORDER BY start_date DESC
      LIMIT 1;
    `, [propertyId]);

    if (!own.rows.length || Number(own.rows[0].client_id) !== clientId) {
      await c.query(`
        UPDATE property_owner
        SET end_date = CURRENT_DATE
        WHERE property_id = $1 AND end_date IS NULL;
      `, [propertyId]);

      await c.query(`
        INSERT INTO property_owner (property_id, client_id, start_date, end_date)
        VALUES ($1, $2, CURRENT_DATE, NULL);
      `, [propertyId, clientId]);

      created.owners++;
    }

    // matcher: texto de transferencia (para tu auto-assign)
    const matcherText = fullName; // tu lógica usa LIKE upper(desc) LIKE %match_text%
    const insMatcher = await c.query(`
      INSERT INTO client_payment_matcher (client_id, match_text, match_mode, is_active, created_at)
      VALUES ($1, $2, 'ILIKE', true, now())
      ON CONFLICT ON CONSTRAINT uq_client_matcher_client_text DO NOTHING
      RETURNING id;
    `, [clientId, matcherText]);

    if (insMatcher.rows.length) created.matchers++;

    // contadores aproximados (client/property upsert no distingue si existía)
  }

  return created;
}

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function seedMovements(c, { accounts, communityId }) {
  // Obtén clientes de la comunidad (via properties/owners)
  const owners = await c.query(`
    SELECT DISTINCT c.id AS client_id, c.full_name
    FROM property p
    JOIN property_owner po ON po.property_id = p.id AND po.end_date IS NULL
    JOIN client c ON c.id = po.client_id
    WHERE p.community_id = $1
    ORDER BY c.id;
  `, [communityId]);

  const cuotasAcc = accounts.find(a => a.alias === 'CUOTAS');
  const gastosAcc = accounts.find(a => a.alias === 'GASTOS');

  const inserted = { incomes: 0, expenses: 0 };

  // Sembrar ingresos: 6 meses de pagos por cliente (para que haya morosidad si faltan algunos)
  // Usamos reference1 único: DEMO-IN-<accountId>-<clientId>-<yyyymm>-<n>
  const now = new Date();
  const year = now.getUTCFullYear(); // ok para demo
  const months = [1,2,3,4,5,6]; // simple

  for (const row of owners.rows) {
    const name = row.full_name;
    for (const m of months) {
      // simula que algunos meses no pagaron (morosidad)
      if (Math.random() < 0.2) continue;

      const yyyymm = `${year}${String(m).padStart(2,'0')}`;
      const ref = `DEMO-IN-${cuotasAcc.id}-${row.client_id}-${yyyymm}`;

      const amount = randomBetween(200, 350);
      const day = Math.min(25, 5 + Math.floor(Math.random() * 20));
      const date = `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

      const r = await c.query(`
        INSERT INTO bank_movement (
          bank_account_id, movement_date, description, reference1, reference2,
          amount, balance_after
        )
        VALUES ($1, $2::date, $3, $4, NULL, $5::numeric(12,2), 0::numeric(12,2))
        ON CONFLICT (bank_account_id, reference1) DO NOTHING
        RETURNING id;
      `, [
        cuotasAcc.id,
        date,
        `TRANSFERENCIA ${name}`,
        ref,
        amount
      ]);

      if (r.rows.length) inserted.incomes++;
    }
  }

  // Sembrar egresos en GASTOS
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
    const date = `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const desc = expenseTemplates[Math.floor(Math.random() * expenseTemplates.length)];
    const ref = `DEMO-OUT-${gastosAcc.id}-${year}${String(m).padStart(2,'0')}-${i}`;

    const amount = -randomBetween(50, 900);

    const r = await c.query(`
      INSERT INTO bank_movement (
        bank_account_id, movement_date, description, reference1, reference2,
        amount, balance_after
      )
      VALUES ($1, $2::date, $3, $4, NULL, $5::numeric(12,2), 0::numeric(12,2))
      ON CONFLICT (bank_account_id, reference1) DO NOTHING
      RETURNING id;
    `, [gastosAcc.id, date, desc, ref, amount]);

    if (r.rows.length) inserted.expenses++;
  }

  return inserted;
}

exports.bootstrapDemo = async ({ email, bankId, community }) => {
  return db.tx(async (c) => {
    // 1) user
    const user = await ensureUser(c, email);

    // 2) community + assign bank
    const comm = await upsertCommunityAndAssignBank(c, {
      name: community.name,
      code: community.code,
      bankId
    });

    // 3) membership owner
    await ensureMembershipOwner(c, { userId: user.id, communityId: comm.id });

    // 4) cuentas bancarias demo
    // Puedes guardar bank.name en bank_account.bank_name para UI
    const b = await c.query(`SELECT name FROM bank WHERE id = $1`, [bankId]);
    const bankName = b.rows[0]?.name || 'BANCO';

    const accounts = await ensureBankAccounts(c, {
      communityId: comm.id,
      bankName,
      currency: 'PEN'
    });

    // 5) clients + properties + owners + fees + matchers
    const created = await ensureClientsPropertiesOwnersFees(c, { communityId: comm.id });

    // 6) movimientos demo
    const mov = await seedMovements(c, { accounts, communityId: comm.id });

    return {
      ok: true,
      user,
      community: comm,
      bank: { id: bankId, name: bankName },
      bankAccounts: accounts,
      created: {
        ...created,
        movements: mov
      }
    };
  });
};
