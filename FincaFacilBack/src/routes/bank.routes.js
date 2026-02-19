const router = require('express').Router();
const c = require('../bank/bank.controller');

router.get('/banks', c.listBanks);

module.exports = router;
