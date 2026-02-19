const db = require('../repository/db.repository');

exports.listClients = async () => {
  const r = await db.query(`
    SELECT id, full_name, email, phone, is_active, created_at
    FROM client
    ORDER BY created_at DESC, id DESC;
  `);
  return r.rows;
};

exports.createClient = async ({ full_name, email, phone }) => {
  const r = await db.query(`
    INSERT INTO client (full_name, email, phone, is_active, created_at)
    VALUES ($1, $2, $3, true, now())
    RETURNING id, full_name, email, phone, is_active, created_at;
  `, [full_name, email, phone]);

  return r.rows[0];
};

exports.updateClient = async ({ id, full_name, email, phone, is_active }) => {
  const fields = [];
  const params = [];
  let idx = 1;

  if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); params.push(full_name); }
  if (email !== undefined)     { fields.push(`email = $${idx++}`);     params.push(email); }
  if (phone !== undefined)     { fields.push(`phone = $${idx++}`);     params.push(phone); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }

  if (fields.length === 0) return { ok: true, updated: 0 };

  params.push(id);

  const r = await db.query(`
    UPDATE client
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING id, full_name, email, phone, is_active, created_at;
  `, params);

  return r.rows[0] || { ok: false, message: 'client no encontrado' };
};

exports.listProperties = async () => {
  const r = await db.query(`
    SELECT id, code, note, is_active, created_at
    FROM property
    ORDER BY code;
  `);
  return r.rows;
};

exports.createProperty = async ({ code, note }) => {
  const r = await db.query(`
    INSERT INTO property (code, note, is_active, created_at)
    VALUES ($1, $2, true, now())
    RETURNING id, code, note, is_active, created_at;
  `, [code, note]);

  return r.rows[0];
};

exports.updateProperty = async ({ id, code, note, is_active }) => {
  const fields = [];
  const params = [];
  let idx = 1;

  if (code !== undefined)      { fields.push(`code = $${idx++}`);      params.push(code); }
  if (note !== undefined)      { fields.push(`note = $${idx++}`);      params.push(note); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }

  if (fields.length === 0) return { ok: true, updated: 0 };

  params.push(id);

  const r = await db.query(`
    UPDATE property
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING id, code, note, is_active, created_at;
  `, params);

  return r.rows[0] || { ok: false, message: 'property no encontrada' };
};

exports.setPropertyFee = async ({ propertyId, monthlyFee, startDate, endDate }) => {
  const r = await db.query(`
    INSERT INTO property_fee (property_id, monthly_fee, start_date, end_date)
    VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4::date)
    RETURNING id, property_id, monthly_fee, start_date, end_date;
  `, [propertyId, monthlyFee, startDate, endDate]);

  return r.rows[0];
};

function normKey(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

exports.upsertCommunity = async ({ name, code }) => {
  const r = await db.query(`
    INSERT INTO community (name, code, created_at)
    VALUES ($1, $2, now())
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING id, name, code;
  `, [name, code]);

  return { community: r.rows[0] };
};

exports.upsertPropertyInCommunity = async ({ communityId, code, note, is_active }) => {
  const comm = await db.query(`SELECT id FROM community WHERE id = $1`, [communityId]);
  if (!comm.rows.length) {
    const err = new Error('communityId no existe');
    err.statusCode = 404;
    throw err;
  }

  const r = await db.query(`
    INSERT INTO property (community_id, code, note, is_active, created_at)
    VALUES ($1, $2, $3, $4, now())
    ON CONFLICT (community_id, code) DO UPDATE
      SET note = EXCLUDED.note,
          is_active = EXCLUDED.is_active
    RETURNING id, community_id, code, note, is_active;
  `, [communityId, code, note, is_active]);

  return { property: r.rows[0] };
};

function normEmail(email) {
  if (!email) return null;
  const x = String(email).trim().toLowerCase();
  return x || null;
}

function normPhone(phone) {
  if (!phone) return null;
  const x = String(phone).replace(/\D/g, '');
  return x || null;
}

exports.upsertClientAssignOwnerAndMatcher = async ({ propertyId, client, startDate, matcherText }) => {
  return db.tx(async (c) => {
    const prop = await c.query(`SELECT id, code FROM property WHERE id = $1`, [propertyId]);
    if (!prop.rows.length) {
      const err = new Error('propertyId no existe');
      err.statusCode = 404;
      throw err;
    }

    const fullName = String(client?.full_name || '').trim();
    if (!fullName) {
      const err = new Error('client.full_name es obligatorio');
      err.statusCode = 400;
      throw err;
    }

    const key = normKey(fullName);

    const cliRes = await c.query(`
      INSERT INTO client (full_name, email, phone, is_active, created_at, norm_key)
      VALUES ($1, $2, $3, true, now(), $4)
      ON CONFLICT (norm_key) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            email = COALESCE(EXCLUDED.email, client.email),
            phone = COALESCE(EXCLUDED.phone, client.phone),
            is_active = true
      RETURNING id, full_name, email, phone, is_active, norm_key;
    `, [fullName, client.email ?? null, client.phone ?? null, key]);

    const clientRow = cliRes.rows[0];
    const clientId = Number(clientRow.id);

    const currentOwner = await c.query(`
      SELECT id, client_id
      FROM property_owner
      WHERE property_id = $1 AND end_date IS NULL
      ORDER BY start_date DESC
      LIMIT 1;
    `, [propertyId]);

    let ownerRow = null;

    if (currentOwner.rows.length && Number(currentOwner.rows[0].client_id) === clientId) {
      ownerRow = { unchanged: true, property_id: String(propertyId), client_id: String(clientId) };
    } else {
      await c.query(`
        UPDATE property_owner
        SET end_date = CASE
          WHEN $2::date IS NULL THEN CURRENT_DATE
          ELSE ($2::date - INTERVAL '1 day')::date
        END
        WHERE property_id = $1
          AND end_date IS NULL;
      `, [propertyId, startDate ?? null]);

      const ownerRes = await c.query(`
        INSERT INTO property_owner (property_id, client_id, start_date, end_date)
        VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), NULL)
        RETURNING id, property_id, client_id, start_date, end_date;
      `, [propertyId, clientId, startDate ?? null]);

      ownerRow = ownerRes.rows[0];
    }

    const mt = String(matcherText ?? fullName).trim();

    let matcherRow = null;
    if (mt) {
      const ins = await c.query(`
        INSERT INTO client_payment_matcher (client_id, match_text, match_mode, is_active, created_at)
        VALUES ($1, $2, 'ILIKE', true, now())
        ON CONFLICT ON CONSTRAINT uq_client_matcher_client_text DO NOTHING
        RETURNING id, client_id, match_text, match_mode, is_active, created_at;
      `, [clientId, mt]);

      if (ins.rows[0]) {
        matcherRow = ins.rows[0];
      } else {
        const existing = await c.query(`
          SELECT id, client_id, match_text, match_mode, is_active, created_at
          FROM client_payment_matcher
          WHERE client_id = $1 AND match_text = $2
          LIMIT 1;
        `, [clientId, mt]);
        matcherRow = existing.rows[0] ?? { unchanged: true, client_id: String(clientId), match_text: mt };
      }
    }

    return {
      ok: true,
      property: { id: String(propertyId), code: prop.rows[0].code },
      client: clientRow,
      owner: ownerRow,
      matcher: matcherRow
    };
  });
};

exports.setPropertyFee = async ({ propertyId, monthlyFee, startDate, endDate }) => {
  return db.tx(async (c) => {
    const prop = await c.query(`SELECT id FROM property WHERE id = $1`, [propertyId]);
    if (!prop.rows.length) {
      const err = new Error('propertyId no existe');
      err.statusCode = 404;
      throw err;
    }

    const start = startDate ? String(startDate) : null;

    await c.query(`
      UPDATE property_fee
      SET end_date = CASE
        WHEN $2::date IS NULL THEN CURRENT_DATE
        ELSE ($2::date - INTERVAL '1 day')::date
      END
      WHERE property_id = $1
        AND end_date IS NULL;
    `, [propertyId, start]);

    const r = await c.query(`
      INSERT INTO property_fee (property_id, monthly_fee, start_date, end_date)
      VALUES ($1, $2::numeric(12,2), COALESCE($3::date, CURRENT_DATE), $4::date)
      RETURNING id, property_id, monthly_fee, start_date, end_date;
    `, [propertyId, monthlyFee, start, endDate || null]);

    return r.rows[0];
  });
};