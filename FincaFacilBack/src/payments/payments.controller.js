const service = require('./../services/payments.service');
const payments_allocation = require('./../services/payments_allocation.service');
const { toInt } = require('../utils/parse');

function requireCommunity(req, res) {
  if (!req.communityId) {
    res.status(400).json({ error: 'communityId es obligatorio (header X-Community-Id o ?communityId=)' });
    return false;
  }
  return true;
}

exports.autoAssign = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });

    const data = await service.autoAssign({ anio, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.assignManual = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const movementId = toInt(req.body.movementId);
    const clientId = toInt(req.body.clientId);
    if (!movementId || !clientId) return res.status(400).json({ error: 'movementId y clientId son obligatorios' });

    const data = await service.assignManual({ movementId, clientId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getUnidentified = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);
    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });

    const data = await service.getUnassigned({ anio, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getTransferIncomes = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);
    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });

    const limit = toInt(req.query.limit) ?? 500;
    const offset = toInt(req.query.offset) ?? 0;

    const data = await service.getTransferIncomes({ anio, bankId, communityId: req.communityId, limit, offset });
    res.json(data);
  } catch (e) { next(e); }
};

exports.matchPayment = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const { movementId, clientId } = req.body || {};
    if (!movementId || !clientId) return res.status(400).json({ error: 'movementId y clientId son obligatorios' });

    const data = await service.matchPayment({
      movementId: toInt(movementId),
      clientId: toInt(clientId),
      communityId: req.communityId
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

    if (req.communityId && Number(req.communityId) !== Number(communityId)) {
      return res.status(403).json({ error: 'No autorizado para esta comunidad' });
    }

    const data = await service.getUnassignedIncomesByCommunity({ communityId, anio });
    res.json(data);
  } catch (e) { next(e); }
};

exports.autoAssignTransfers = async (req, res, next) => {
  try {
    if (!requireCommunity(req, res)) return;

    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);
    if (!anio || !bankId) return res.status(400).json({ error: 'anio y bankId son obligatorios' });

    const data = await service.autoAssignTransfers({ anio, bankId, communityId: req.communityId });
    res.json(data);
  } catch (e) { next(e); }
};

exports.applyUnidentifiedAmount = async (req, res, next) => {
  try {
    const communityId = toInt(req.body.communityId);
    const movementId = toInt(req.body.movementId);
    const clientId = toInt(req.body.clientId);
    const amount = Number(req.body.amount);

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!movementId) return res.status(400).json({ error: 'movementId es obligatorio' });
    if (!clientId) return res.status(400).json({ error: 'clientId es obligatorio' });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'amount inválido' });

    const data = await service.applyUnidentifiedAmount({ communityId, movementId, clientId, amount });
    res.status(201).json(data);
  } catch (e) { next(e); }
};


exports.allocateUnidentified = async (req, res, next) => {
  try {
    const communityId = toInt(req.body.communityId);
    const anio = toInt(req.body.anio);
    const sourceMes = toInt(req.body.sourceMes);
    const targetMes = toInt(req.body.targetMes);
    const clientId = toInt(req.body.clientId);

    const delta = req.body.delta !== undefined ? Number(req.body.delta) : undefined;

    const amount = req.body.amount !== undefined ? Number(req.body.amount) : undefined;

    const note = req.body.note ?? null;

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!anio) return res.status(400).json({ error: 'anio es obligatorio' });
    if (!sourceMes || sourceMes < 1 || sourceMes > 12) return res.status(400).json({ error: 'sourceMes inválido' });
    if (!targetMes || targetMes < 1 || targetMes > 12) return res.status(400).json({ error: 'targetMes inválido' });
    if (!clientId) return res.status(400).json({ error: 'clientId es obligatorio' });

    if (delta === undefined && amount === undefined) {
      return res.status(400).json({ error: 'Debes enviar delta (incremento) o amount (valor final)' });
    }

    if (delta !== undefined && (!Number.isFinite(delta) || delta <= 0)) {
      return res.status(400).json({ error: 'delta debe ser número > 0' });
    }

    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      return res.status(400).json({ error: 'amount debe ser número >= 0' });
    }

    const actor = String(req.headers['x-user-email'] || 'manual').trim().toLowerCase();

    const data = await payments_allocation.allocateUnidentified({
      communityId,
      anio,
      sourceMes,
      targetMes,
      clientId,
      delta,
      amount,
      note,
      actor
    });

    res.json(data);
  } catch (e) { next(e); }
};