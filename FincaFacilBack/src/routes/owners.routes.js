const router = require('express').Router();
const c = require('../owners/owners.controller');
console.log('owners.controller keys:', Object.keys(c));
router.get('/owners/monthly-grid', c.getMonthlyGrid);

router.get('/communities/:communityId/owners/monthly', c.getCommunityOwnersMonthly);
router.get('/communities/:communityId/morosidad', c.getCommunityMorosidad);

module.exports = router;
