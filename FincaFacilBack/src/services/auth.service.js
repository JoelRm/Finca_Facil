const db = require('../repository/db.repository');

exports.getCommunitiesByEmail = async (email) => {
  const userRes = await db.query(
    `SELECT id, email, full_name
     FROM app_user
     WHERE lower(email) = $1`,
    [email]
  );

  if (!userRes.rows.length) {
    return {
      userExists: false,
      communities: []
    };
  }

  const user = userRes.rows[0];

  const commRes = await db.query(`
    SELECT
      c.id,
      c.name,
      c.code,
      cm.role
    FROM community_member cm
    JOIN community c ON c.id = cm.community_id
    WHERE cm.user_id = $1
    ORDER BY c.name;
  `, [user.id]);

  return {
    userExists: true,
    user,
    communities: commRes.rows
  };
};

exports.loginWithCommunity = async ({ email, communityId }) => {
  return db.tx(async (c) => {

    // 1️⃣ Buscar o crear usuario (demo)
    let userRes = await c.query(
      `SELECT id, email, full_name
       FROM app_user
       WHERE lower(email) = $1`,
      [email]
    );

    let user;

    if (!userRes.rows.length) {
      const ins = await c.query(`
        INSERT INTO app_user (email, is_active, created_at)
        VALUES ($1, true, now())
        RETURNING id, email, full_name;
      `, [email]);

      user = ins.rows[0];
    } else {
      user = userRes.rows[0];
    }

    // 2️⃣ Validar membresía
    const memberRes = await c.query(`
      SELECT cm.role, c.name
      FROM community_member cm
      JOIN community c ON c.id = cm.community_id
      WHERE cm.user_id = $1
        AND cm.community_id = $2
      LIMIT 1;
    `, [user.id, communityId]);

    if (!memberRes.rows.length) {
      const err = new Error('El usuario no pertenece a esta comunidad');
      err.statusCode = 403;
      throw err;
    }

    const role = memberRes.rows[0].role;
    const communityName = memberRes.rows[0].name;

    return {
      ok: true,
      user,
      community: {
        id: communityId,
        name: communityName
      },
      role
    };
  });
};
