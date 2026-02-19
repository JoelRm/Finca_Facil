const db = require('../repository/db.repository');

function normalizeKey(s) {
  if (!s) return null;
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extractNameFromDescription(desc) {
  if (!desc) return null;
  const d = desc.toUpperCase();
  if (!d.startsWith('TRANSFERENCIA')) return null;
  return d.replace(/^TRANSFERENCIA\s+/, '').trim() || null;
}

exports.detectClientsFromTransfers = async ({ anio, bankId }) => {
  const mov = await db.query(`
    SELECT id, description
    FROM bank_movement
    WHERE bank_account_id = $1
      AND movement_date >= make_date($2, 1, 1)
      AND movement_date <  make_date($2 + 1, 1, 1)
      AND amount > 0
      AND upper(description) LIKE 'TRANSFERENCIA%'
    ORDER BY movement_date ASC, id ASC;
  `, [bankId, anio]);

  let created = 0;
  let existing = 0;
  let ignored = 0;

  for (const m of mov.rows) {
    const raw = extractNameFromDescription(m.description);
    const norm = normalizeKey(raw);

    if (!norm || norm.length < 3) { ignored++; continue; }

    const ins = await db.query(`
      INSERT INTO client (full_name, norm_key, is_active, created_at)
      VALUES ($1, $2, true, now())
      ON CONFLICT (norm_key) DO NOTHING
      RETURNING id;
    `, [norm, norm]);

    if (ins.rows[0]?.id) created++;
    else existing++;
  }

  return {
    scanned: mov.rowCount,
    created,
    existing,
    ignored,
  };
};
