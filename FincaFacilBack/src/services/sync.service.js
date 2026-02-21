const db = require('../repository/db.repository');
const { assertBankAccountInCommunity } = require('../repository/community.repository');

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

exports.detectClientsFromTransfers = async ({ anio, bankId, communityId }) => {
  await assertBankAccountInCommunity({ bankAccountId: bankId, communityId });

  const mov = await db.query(`
    SELECT bm.id, bm.description
    FROM bank_movement bm
    JOIN bank_account ba ON ba.id = bm.bank_account_id
    WHERE bm.bank_account_id = $1
      AND ba.community_id = $3
      AND bm.movement_date >= make_date($2, 1, 1)
      AND bm.movement_date <  make_date($2 + 1, 1, 1)
      AND bm.amount > 0
      AND upper(bm.description) LIKE 'TRANSFERENCIA%'
    ORDER BY bm.movement_date ASC, bm.id ASC;
  `, [bankId, anio, communityId]);

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

  return { scanned: mov.rowCount, created, existing, ignored };
};
