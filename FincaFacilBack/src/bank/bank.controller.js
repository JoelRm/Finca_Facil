const service = require('../services/bank.service');

exports.listBanks = async (req, res, next) => {
  try {
    const data = await service.listBanks();
    res.json(data);
  } catch (e) { next(e); }
};
