const router = require('express').Router();
const c = require('../demo/demo.controller');

router.post('/demo/bootstrap', c.bootstrapDemo);

module.exports = router;
