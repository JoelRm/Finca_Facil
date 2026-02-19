const router = require('express').Router();
const c = require('../auth/auth.controller');

router.post('/auth/communities', c.getCommunitiesByEmail);
router.post('/auth/login', c.loginWithCommunity);

module.exports = router;
