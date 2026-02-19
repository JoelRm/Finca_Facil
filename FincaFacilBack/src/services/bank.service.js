const db = require('../repository/db.repository');

exports.listBanks = async () => {
  const r = await db.query(`
    SELECT id, code, name, country_code
    FROM bank
    WHERE is_active = true
    ORDER BY name;
  `);
  return r.rows;
};
