const service = require('./../services/admin.service');
const { toInt } = require('../utils/parse');

exports.listClients = async (req, res, next) => {
  try {
    const data = await service.listClients();
    res.json(data);
  } catch (e) { next(e); }
};

exports.createClient = async (req, res, next) => {
  try {
    const full_name = (req.body.full_name || '').trim();
    const email = req.body.email || null;
    const phone = req.body.phone || null;

    if (!full_name) return res.status(400).json({ error: 'full_name es obligatorio' });

    const data = await service.createClient({ full_name, email, phone });
    res.status(201).json(data);
  } catch (e) { next(e); }
};

exports.updateClient = async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const payload = {
      full_name: req.body.full_name?.trim(),
      email: req.body.email ?? undefined,
      phone: req.body.phone ?? undefined,
      is_active: typeof req.body.is_active === 'boolean' ? req.body.is_active : undefined,
    };

    const data = await service.updateClient({ id, ...payload });
    res.json(data);
  } catch (e) { next(e); }
};

exports.listProperties = async (req, res, next) => {
  try {
    const data = await service.listProperties();
    res.json(data);
  } catch (e) { next(e); }
};

exports.createProperty = async (req, res, next) => {
  try {
    const code = (req.body.code || '').trim();
    const note = req.body.note || null;

    if (!code) return res.status(400).json({ error: 'code es obligatorio' });

    const data = await service.createProperty({ code, note });
    res.status(201).json(data);
  } catch (e) { next(e); }
};

exports.updateProperty = async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const payload = {
      code: req.body.code?.trim(),
      note: req.body.note ?? undefined,
      is_active: typeof req.body.is_active === 'boolean' ? req.body.is_active : undefined,
    };

    const data = await service.updateProperty({ id, ...payload });
    res.json(data);
  } catch (e) { next(e); }
};

exports.setPropertyFee = async (req, res, next) => {
  try {
    const propertyId = toInt(req.params.id);
    const monthlyFee = Number(req.body.monthlyFee);
    const startDate = req.body.startDate || null;
    const endDate = req.body.endDate || null;

    if (!propertyId || !Number.isFinite(monthlyFee)) {
      return res.status(400).json({ error: 'propertyId y monthlyFee son obligatorios' });
    }

    const data = await service.setPropertyFee({ propertyId, monthlyFee, startDate, endDate });
    res.status(201).json(data);
  } catch (e) { next(e); }
};

exports.upsertCommunity = async (req, res, next) => {
  try {
    const { name, code } = req.body || {};
    if (!name || !code) return res.status(400).json({ error: 'name y code son obligatorios' });

    const data = await service.upsertCommunity({ name, code });
    res.json(data);
  } catch (e) { next(e); }
};

exports.upsertPropertyInCommunity = async (req, res, next) => {
  try {
    const communityId = toInt(req.params.communityId);
    const { code, note, is_active } = req.body || {};

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!code) return res.status(400).json({ error: 'code es obligatorio' });

    const data = await service.upsertPropertyInCommunity({
      communityId,
      code,
      note: note ?? null,
      is_active: is_active ?? true
    });
    res.json(data);
  } catch (e) { next(e); }
};

exports.upsertClientAssignOwnerAndMatcher = async (req, res, next) => {
  try {
    const propertyId = toInt(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: 'propertyId inválido' });

    const { client, startDate, matcherText } = req.body || {};
    const data = await service.upsertClientAssignOwnerAndMatcher({
      propertyId,
      client,
      startDate,
      matcherText
    });

    res.status(201).json(data);
  } catch (e) { next(e); }
};

exports.upsertPropertyInCommunityWithFee = async (req, res, next) => {
  try {
    const communityId = toInt(req.params.communityId);
    const { code, note, is_active, monthlyFee, startDate } = req.body || {};

    if (!communityId) return res.status(400).json({ error: 'communityId es obligatorio' });
    if (!code || !String(code).trim()) return res.status(400).json({ error: 'code es obligatorio' });

    const fee = Number(monthlyFee);
    if (!Number.isFinite(fee)) return res.status(400).json({ error: 'monthlyFee es obligatorio' });

    const data = await service.upsertPropertyInCommunityWithFee({
      communityId,
      code: String(code).trim(),
      note: note ?? null,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      monthlyFee: fee,
      startDate: startDate || null
    });

    res.status(201).json(data);
  } catch (e) { next(e); }
};