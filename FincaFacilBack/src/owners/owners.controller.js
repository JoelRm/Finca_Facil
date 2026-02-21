const service = require('../services/owners.service');
const { toInt } = require('../utils/parse');

function requireCommunity(req, res) {
  if (!req.communityId) {
    res.status(400).json({ error: 'communityId es obligatorio (header X-Community-Id o ?communityId=)' });
    return false;
  }
  return true;
}

exports.getMonthlyGrid = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);
    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });

    const data = await service.getMonthlyGrid({ anio, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getCommunityMorosidad = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const hastaMes = toInt(req.query.hastaMes) ?? 12;
    const bankId = toInt(req.query.bankId);

    const communityId = req.communityId;

    if (!communityId) {
      return res.status(400).json({ error: 'communityId no definido en contexto' });
    }

    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });
    if (hastaMes < 1 || hastaMes > 12) {
      return res.status(400).json({ error: 'hastaMes debe estar entre 1 y 12' });
    }

    const data = await service.getCommunityMorosidad({
      communityId,
      anio,
      hastaMes,
      bankId
    });

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
    if (req.communityId && Number(req.communityId) !== Number(communityId)) {
      return res.status(403).json({ error: 'No autorizado para esta comunidad' });
    }
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
    if (req.communityId && Number(req.communityId) !== Number(communityId)) {
      return res.status(403).json({ error: 'No autorizado para esta comunidad' });
    }
    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });
    if (hastaMes < 1 || hastaMes > 12) return res.status(400).json({ error: 'hastaMes debe estar entre 1 y 12' });

    const data = await service.getCommunityMorosidad({ communityId, anio, hastaMes, bankId });
    res.json(data);
  } catch (e) { next(e); }
};
