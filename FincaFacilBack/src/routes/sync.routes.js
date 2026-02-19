const router = require('express').Router();
const c = require('./../sync/sync.controller');

router.post('/sync/detect-clients', c.detectClientsFromTransfers);

module.exports = router;
