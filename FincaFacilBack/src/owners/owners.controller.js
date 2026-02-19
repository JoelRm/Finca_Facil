const service = require('../services/owners.service');
const { toInt } = require('../utils/parse');

exports.getMonthlyGrid = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });

    const data = await service.getMonthlyGrid({ anio, bankId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getMorosidad = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);
    const hastaMes = toInt(req.query.hastaMes) ?? 12;

    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });
    if (hastaMes < 1 || hastaMes > 12) return res.status(400).json({ error: 'hastaMes debe estar entre 1 y 12' });

    const data = await service.getMorosidad({ anio, bankId, hastaMes });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getCommunityOwnersMonthly = async (req, res, next) => {
  try {
    const communityId = toInt(req.params.communityId);
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);
    const hastaMes = toInt(req.query.hastaMes) ?? 12;

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });
    if (hastaMes < 1 || hastaMes > 12) return res.status(400).json({ error: 'hastaMes debe estar entre 1 y 12' });

    const data = await service.getCommunityOwnersMonthly({ communityId, anio, bankId, hastaMes });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getCommunityMorosidad = async (req, res, next) => {
  try {
    const communityId = toInt(req.params.communityId);
    const anio = toInt(req.query.anio);
    const hastaMes = toInt(req.query.hastaMes) ?? 12;
    const bankId = toInt(req.query.bankId);

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });
    if (hastaMes < 1 || hastaMes > 12) return res.status(400).json({ error: 'hastaMes debe estar entre 1 y 12' });

    const data = await service.getCommunityMorosidad({ communityId, anio, hastaMes, bankId });
    res.json(data);
  } catch (e) { next(e); }
};