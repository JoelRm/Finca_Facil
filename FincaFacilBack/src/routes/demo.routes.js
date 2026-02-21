const router = require('express').Router();
const c = require('../demo/demo.controller');

router.post('/demo/assign-bank', c.assignBankAndSeedDemo);

module.exports = router;
