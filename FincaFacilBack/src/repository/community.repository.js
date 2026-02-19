const db = require('./db.repository');

exports.assertBankAccountInCommunity = async ({ bankAccountId, communityId }) => {
  const r = await db.query(
    `SELECT id, community_id
     FROM bank_account
     WHERE id = $1`,
    [bankAccountId]
  );

  if (!r.rows.length) {
    const err = new Error('bankId (bank_account_id) no existe');
    err.statusCode = 404;
    throw err;
  }

  if (communityId && Number(r.rows[0].community_id) !== Number(communityId)) {
    const err = new Error('bankId no pertenece a la comunidad');
    err.statusCode = 403;
    throw err;
  }

  return { ok: true, bankAccountId, communityId: r.rows[0].community_id };
};
