  const db = require('../repository/db.repository');
  const crypto = require('crypto');

  function normKey(s) {
    return String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  async function ensureUser(c, email, fullName = null) {
    const nameToSave = (String(fullName || '').trim()) || email;

    const r = await c.query(`
      INSERT INTO app_user (email, full_name, password_hash, is_active, created_at)
      VALUES ($1::varchar, $2::varchar, $3::varchar, true, now())
      ON CONFLICT (email) DO UPDATE
        SET is_active = true,
            full_name = COALESCE(app_user.full_name, EXCLUDED.full_name)
      RETURNING id, email, full_name;
    `, [email, nameToSave, 'DEMO']);

    return r.rows[0];
  }

  async function assertCommunityExists(c, communityId) {
    const r = await c.query(`SELECT id, name, code, bank_id FROM community WHERE id = $1`, [communityId]);
    if (!r.rows.length) {
      const err = new Error('communityId no existe');
      err.statusCode = 404;
      throw err;
    }
    return r.rows[0];
  }

  async function assertBankExists(c, bankId) {
    const r = await c.query(`SELECT id, name FROM bank WHERE id = $1 AND is_active = true`, [bankId]);
    if (!r.rows.length) {
      const err = new Error('bankId no existe o está inactivo');
      err.statusCode = 400;
      throw err;
    }
    return r.rows[0];
  }

  async function ensureMembership(c, { userId, communityId }) {
    const role = 'president';

    const r = await c.query(`
      INSERT INTO community_member (user_id, community_id, role, joined_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id, community_id) DO UPDATE
        SET role = EXCLUDED.role
      RETURNING user_id, community_id, role, joined_at;
    `, [userId, communityId, role]);

    return r.rows[0];
  }

  async function setCommunityBank(c, { communityId, bankId }) {
    const r = await c.query(`
      UPDATE community
      SET bank_id = $2
      WHERE id = $1
      RETURNING id, name, code, bank_id;
    `, [communityId, bankId]);

    return r.rows[0];
  }

  async function ensureBankAccounts(c, { communityId, bankName, currency = 'PEN' }) {
    const defaults = [
      { alias: 'CUOTAS',  account_number: `000-${communityId}-1` },
      { alias: 'GASTOS',  account_number: `000-${communityId}-2` },
      { alias: 'RESERVA', account_number: `000-${communityId}-3` },
    ];

    const out = [];
    for (const a of defaults) {
      const r = await c.query(`
        INSERT INTO bank_account (community_id, alias, bank_name, account_number, currency, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, true, now())
        ON CONFLICT (community_id, alias) DO UPDATE
          SET bank_name = EXCLUDED.bank_name,
              account_number = EXCLUDED.account_number,
              currency = EXCLUDED.currency,
              is_active = true
        RETURNING id, community_id, alias, bank_name, account_number, currency;
      `, [communityId, a.alias, bankName, a.account_number, currency]);

      out.push(r.rows[0]);
    }
    return out;
  }

  async function ensureClientsPropertiesOwnersFees(c, { communityId }) {
    const demo = [
      { propertyCode: 'A-101', owner: 'JUAN PEREZ',   fee: 250 },
      { propertyCode: 'A-102', owner: 'MARIA LOPEZ',  fee: 250 },
      { propertyCode: 'A-103', owner: 'CARLOS DIAZ',  fee: 250 },
      { propertyCode: 'B-201', owner: 'ANA TORRES',   fee: 300 },
      { propertyCode: 'B-202', owner: 'LUIS RAMIREZ', fee: 300 },
    ];

    const created = { fees: 0, owners: 0, matchers: 0 };

    for (const d of demo) {
      const fullName = d.owner.trim();
      const key = normKey(fullName);

      const cli = await c.query(`
        INSERT INTO client (full_name, norm_key, is_active, created_at)
        VALUES ($1, $2, true, now())
        ON CONFLICT (norm_key) DO UPDATE
          SET full_name = EXCLUDED.full_name,
              is_active = true
        RETURNING id;
      `, [fullName, key]);
      const clientId = Number(cli.rows[0].id);

      const prop = await c.query(`
        INSERT INTO property (community_id, code, note, is_active, created_at)
        VALUES ($1, $2, null, true, now())
        ON CONFLICT (community_id, code) DO UPDATE
          SET is_active = true
        RETURNING id;
      `, [communityId, d.propertyCode]);
      const propertyId = Number(prop.rows[0].id);

      const feeCheck = await c.query(`
        SELECT monthly_fee
        FROM property_fee
        WHERE property_id = $1 AND end_date IS NULL
        ORDER BY start_date DESC
        LIMIT 1;
      `, [propertyId]);

      if (!feeCheck.rows.length || Number(feeCheck.rows[0].monthly_fee) !== Number(d.fee)) {
        await c.query(`UPDATE property_fee SET end_date = CURRENT_DATE WHERE property_id = $1 AND end_date IS NULL;`, [propertyId]);
        await c.query(`
          INSERT INTO property_fee (property_id, monthly_fee, start_date, end_date)
          VALUES ($1, $2::numeric(12,2), CURRENT_DATE, NULL);
        `, [propertyId, d.fee]);
        created.fees++;
      }

      const own = await c.query(`
        SELECT client_id
        FROM property_owner
        WHERE property_id = $1 AND end_date IS NULL
        ORDER BY start_date DESC
        LIMIT 1;
      `, [propertyId]);

      if (!own.rows.length || Number(own.rows[0].client_id) !== clientId) {
        await c.query(`UPDATE property_owner SET end_date = CURRENT_DATE WHERE property_id = $1 AND end_date IS NULL;`, [propertyId]);
        await c.query(`
          INSERT INTO property_owner (property_id, client_id, start_date, end_date)
          VALUES ($1, $2, CURRENT_DATE, NULL);
        `, [propertyId, clientId]);
        created.owners++;
      }

      const insMatcher = await c.query(`
        INSERT INTO client_payment_matcher (client_id, match_text, match_mode, is_active, created_at)
        VALUES ($1, $2, 'ILIKE', true, now())
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

  async function seedMovementsIfNeeded(c, { accounts, communityId }) {
    const accountIds = accounts.map(a => Number(a.id));

    const check = await c.query(`
      SELECT COUNT(*)::int AS n
      FROM bank_movement
      WHERE bank_account_id = ANY($1::bigint[])
        AND reference1 LIKE 'DEMO-%';
    `, [accountIds]);

    if ((check.rows[0]?.n || 0) > 0) {
      return { skipped: true, reason: 'already_seeded', incomes: 0, expenses: 0, linked: 0 };
    }

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

    if (!cuotasAcc || !gastosAcc) {
      const err = new Error('No se encontraron cuentas CUOTAS y/o GASTOS');
      err.statusCode = 500;
      throw err;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const months = [1,2,3,4,5,6];

    let incomes = 0;
    let expenses = 0;
    let linked = 0;

    for (const row of owners.rows) {
      const clientId = Number(row.client_id);
      const name = row.full_name;

      for (const m of months) {
        if (Math.random() < 0.2) continue;

        const amount = randomBetween(200, 350);
        const day = Math.min(25, 5 + Math.floor(Math.random() * 20));
        const date = `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

        const reference1 = `DEMO-IN-${communityId}-${crypto.randomUUID()}`;

        const ins = await c.query(`
          INSERT INTO bank_movement (
            bank_account_id, movement_date, description, reference1, reference2,
            amount, balance_after
          )
          VALUES ($1, $2::date, $3, $4, NULL, $5::numeric(12,2), 0::numeric(12,2))
          RETURNING id;
        `, [Number(cuotasAcc.id), date, `TRANSFERENCIA ${name}`, reference1, amount]);

        incomes++;

        const movementId = Number(ins.rows[0].id);

        const link = await c.query(`
          INSERT INTO bank_movement_client (movement_id, client_id, assigned_by, assigned_at)
          VALUES ($1, $2, 'seed', now())
          ON CONFLICT (movement_id) DO NOTHING
          RETURNING movement_id;
        `, [movementId, clientId]);

        if (link.rows.length) linked++;
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
      const date = `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const desc = expenseTemplates[Math.floor(Math.random() * expenseTemplates.length)];
      const reference1 = `DEMO-OUT-${communityId}-${crypto.randomUUID()}`;
      const amount = -randomBetween(50, 900);

      await c.query(`
        INSERT INTO bank_movement (
          bank_account_id, movement_date, description, reference1, reference2,
          amount, balance_after
        )
        VALUES ($1, $2::date, $3, $4, NULL, $5::numeric(12,2), 0::numeric(12,2));
      `, [Number(gastosAcc.id), date, desc, reference1, amount]);

      expenses++;
    }

    return { skipped: false, incomes, expenses, linked };
  }

  exports.registerDemo = async ({ email, communityId, bankId, seedDemo }) => {
    return db.tx(async (c) => {
      const user = await ensureUser(c, email);

      const community = await assertCommunityExists(c, communityId);

      const membership = await ensureMembership(c, { userId: user.id, communityId });

      let bank = null;
      let bankAccounts = [];
      let created = null;
      let movements = null;

      if (bankId) {
        bank = await assertBankExists(c, bankId);

        await setCommunityBank(c, { communityId, bankId });

        bankAccounts = await ensureBankAccounts(c, {
          communityId,
          bankName: bank.name,
          currency: 'ERU'
        });

        if (seedDemo === true) {
          created = await ensureClientsPropertiesOwnersFees(c, { communityId });
          movements = await seedMovementsIfNeeded(c, { accounts: bankAccounts, communityId });
        }
      }

      return {
        ok: true,
        user,
        community,
        membership,
        bank,
        bankAccounts,
        created,
        movements
      };
    });
  };

  exports.loginByEmail = async ({ email }) => {
    const r = await db.query(`
      SELECT id, email, full_name
      FROM app_user
      WHERE lower(email) = lower($1)
      LIMIT 1;
    `, [email]);

    if (!r.rows.length) {
      return { ok: false, userExists: false, communities: [], defaultCommunity: null };
    }

    const user = r.rows[0];

    const commRes = await db.query(`
      SELECT
        c.id,
        c.name,
        c.code,
        cm.role,
        cm.joined_at
      FROM community_member cm
      JOIN community c ON c.id = cm.community_id
      WHERE cm.user_id = $1::bigint
      ORDER BY cm.joined_at DESC, c.name ASC;
    `, [user.id]);

    const communities = commRes.rows.map(x => ({
      id: Number(x.id),
      name: x.name,
      code: x.code,
      role: x.role,
      joined_at: x.joined_at
    }));

    const defaultCommunity = communities.length ? communities[0] : null;

    return {
      ok: true,
      userExists: true,
      user: {
        id: String(user.id),
        email: user.email,
        full_name: user.full_name
      },
      communities,
      defaultCommunity
    };
  };

  exports.getCommunitiesByEmail = async (email) => {
    const userRes = await db.query(
      `SELECT id, email, full_name FROM app_user WHERE lower(email) = lower($1)`,
      [email]
    );

    if (!userRes.rows.length) return { userExists: false, communities: [] };

    const user = userRes.rows[0];

    const commRes = await db.query(`
      SELECT c.id, c.name, c.code, cm.role
      FROM community_member cm
      JOIN community c ON c.id = cm.community_id
      WHERE cm.user_id = $1
      ORDER BY c.name;
    `, [user.id]);

    return { userExists: true, user, communities: commRes.rows };
  };
