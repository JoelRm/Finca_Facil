const service = require('../services/sync.service');
const { toInt } = require('../utils/parse');

exports.detectClientsFromTransfers = async (req, res, next) => {
  try {
    const anio = toInt(req.query.anio);
    const bankId = toInt(req.query.bankId);

    if (!anio || !bankId) {
      return res.status(400).json({ error: 'anio y bankId son obligatorios' });
    }

    const data = await service.detectClientsFromTransfers({ anio, bankId });
    res.json(data);
  } catch (e) { next(e); }
};
