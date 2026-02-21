const router = require('express').Router();
const c = require('../auth/auth.controller');

router.post('/auth/communities', c.getCommunitiesByEmail);
router.get('/auth/profile', c.profile);
router.post('/auth/register', c.registerDemo);
router.post('/auth/login', c.login);

module.exports = router;
