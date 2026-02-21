const service = require('../services/dashboard.service');
const { toInt } = require('../utils/parse');

function requireCommunity(req, res) {
  if (!req.communityId) {
    res.status(400).json({ error: 'communityId es obligatorio (header X-Community-Id o ?communityId=)' });
    return false;
  }
  return true;
}

exports.getFiltros = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;
    const data = await service.getFiltros({ communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getKpis = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const mes = toInt(req.query.mes);
    const bankId = toInt(req.query.bankId);

    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });

    const data = await service.getKpis({ anio, mes, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getCategorias = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const mes = toInt(req.query.mes);
    const bankId = toInt(req.query.bankId);

    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });

    const data = await service.getCategorias({ anio, mes, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getEvolucion = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });

    const data = await service.getEvolucion({ anio, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getGastosPorCategoria = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const mes = toInt(req.query.mes);
    const bankId = toInt(req.query.bankId);

    if (!anio || !mes) return res.status(400).json({ error: 'anio y mes son obligatorios' });

    const data = await service.getGastosPorCategoria({ anio, mes, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getMovimientos = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });

    const data = await service.getMovimientos({
      anio,
      communityId: req.communityId,
      bankId: toInt(req.query.bankId),
      categoriaId: toInt(req.query.categoriaId),
      tipo: req.query.tipo,
      limit: toInt(req.query.limit) ?? 500,
      offset: toInt(req.query.offset) ?? 0,
    });

    res.json(data);
  } catch (e) { next(e); }
};

exports.getBancos = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;
    const data = await service.getBancos({ communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};
