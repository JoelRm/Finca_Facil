const service = require('../services/auth.service');

exports.getCommunitiesByEmail = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email es obligatorio' });

    const data = await service.getCommunitiesByEmail(email);
    res.json(data);
  } catch (e) { next(e); }
};

exports.profile = async (req, res, next) => {
  try {
    const email = String(req.headers['x-user-email'] || '').trim().toLowerCase();
    const communityId = Number(req.headers['x-community-id']);

    if (!email) return res.status(400).json({ error: 'X-User-Email es obligatorio' });
    if (!communityId) return res.status(400).json({ error: 'X-Community-Id es obligatorio' });

    const data = await service.getProfile({ email, communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.registerDemo = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const communityId = Number(req.body.communityId);
    const bankId = req.body.bankId ? Number(req.body.bankId) : null;
    const seedDemo = req.body.seedDemo === true;

    if (!email) return res.status(400).json({ error: 'email es obligatorio' });
    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });

    const data = await service.registerDemo({ email, communityId, bankId, seedDemo });
    res.status(201).json(data);
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email es obligatorio' });

    const data = await service.loginByEmail({ email });
    res.json(data);
  } catch (e) { next(e); }
};
    