const router = require('express').Router();
const c = require('../communities/communities.controller');

router.get('/communities', c.listCommunities);

module.exports = router;