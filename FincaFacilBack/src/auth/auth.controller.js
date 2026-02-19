const service = require('../services/auth.service');

exports.getCommunitiesByEmail = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email es obligatorio' });

    const data = await service.getCommunitiesByEmail(email);
    res.json(data);
  } catch (e) { next(e); }
};

exports.loginWithCommunity = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const communityId = Number(req.body.communityId);

    if (!email || !communityId) {
      return res.status(400).json({ error: 'email y communityId son obligatorios' });
    }

    const data = await service.loginWithCommunity({ email, communityId });
    res.json(data);
  } catch (e) { next(e); }
};
