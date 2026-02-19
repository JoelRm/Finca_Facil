const service = require('../services/demo.service');

exports.bootstrapDemo = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const bankId = Number(req.body.bankId);
    const community = req.body.community || {};

    if (!email) return res.status(400).json({ error: 'email es obligatorio' });
    if (!bankId) return res.status(400).json({ error: 'bankId es obligatorio' });
    if (!community.name || !community.code) {
      return res.status(400).json({ error: 'community.name y community.code son obligatorios' });
    }

    const data = await service.bootstrapDemo({
      email,
      bankId,
      community: { name: String(community.name).trim(), code: String(community.code).trim() }
    });

    res.status(201).json(data);
  } catch (e) { next(e); }
};
