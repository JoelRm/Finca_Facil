const db = require('../repository/db.repository');

exports.listCommunities = async () => {
  const res = await db.query(`
    SELECT
      id,
      name,
      code,
      created_at
    FROM community
    WHERE bank_id IS NULL
    ORDER BY name ASC;
  `);

  return {
    ok: true,
    total: res.rows.length,
    communities: res.rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      code: r.code,
      createdAt: r.created_at
    }))
  };
};