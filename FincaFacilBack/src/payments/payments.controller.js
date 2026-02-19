const service = require('./../services/payments.service');
const { toInt } = require('../utils/parse');

exports.autoAssign = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) {
      return res.status(400).json({ error: 'anio y bankId son obligatorios' });
    }

    const data = await service.autoAssign({ anio, bankId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.assignManual = async (req, res, next) => {
  try {
    const movementId = toInt(req.body.movementId);
    const clientId = toInt(req.body.clientId);

    if (!movementId || !clientId) {
      return res.status(400).json({ error: 'movementId y clientId son obligatorios' });
    }

    const data = await service.assignManual({ movementId, clientId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getUnidentified = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) {
      return res.status(400).json({ error: 'anio y bankId son obligatorios' });
    }

    const data = await service.getUnidentified({ anio, bankId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getTransferIncomes = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) {
      return res.status(400).json({ error: 'anio y bankId son obligatorios' });
    }

    const limit = toInt(req.query.limit) ?? 500;
    const offset = toInt(req.query.offset) ?? 0;

    const data = await service.getTransferIncomes({ anio, bankId, limit, offset });
    res.json(data);
  } catch (e) { next(e); }
};

exports.matchPayment = async (req, res, next) => {
  try {
    const { movementId, clientId, communityId } = req.body || {};
    if (!movementId || !clientId) return res.status(400).json({ error: 'movementId y clientId son obligatorios' });

    const data = await service.matchPayment({
      movementId: toInt(movementId),
      clientId: toInt(clientId),
      communityId: communityId ? toInt(communityId) : null
    });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getUnassignedIncomesByCommunity = async (req, res, next) => {
  try {
    const communityId = toInt(req.params.communityId);
    const anio = toInt(req.query.anio);

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });

    const data = await service.getUnassignedIncomesByCommunity({ communityId, anio });
    res.json(data);
  } catch (e) { next(e); }
};

exports.autoAssignTransfers = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) {
      return res.status(400).json({ error: 'anio y bankId son obligatorios' });
    }

    const data = await service.autoAssignTransfers({ anio, bankId });
    res.json(data);
  } catch (e) { next(e); }
};