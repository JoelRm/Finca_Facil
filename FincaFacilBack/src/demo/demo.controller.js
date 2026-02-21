const service = require('../services/demo.service');

exports.assignBankAndSeedDemo = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const bankId = Number(req.body.bankId);
    const communityId = Number(req.body.communityId);

    if (!email) return res.status(400).json({ error: 'email es obligatorio' });
    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!bankId) return res.status(400).json({ error: 'bankId es obligatorio' });

    const data = await service.assignBankAndSeedDemo({ email, communityId, bankId });

    res.status(201).json(data);
  } catch (e) { next(e); }
};
