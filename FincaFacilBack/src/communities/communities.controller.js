const service = require('../services/communities.service');

exports.listCommunities = async (req, res, next) => {
  try {
    const data = await service.listCommunities();
    res.json(data);
  } catch (e) {
    next(e);
  }
};