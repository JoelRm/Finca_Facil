const { toInt } = require('../utils/parse');

module.exports = (req, res, next) => {
  const headerId = toInt(req.header('X-Community-Id'));
  const queryId  = toInt(req.query.communityId);

  req.communityId = headerId || queryId || null;
  next();
};
