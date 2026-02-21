const router = require('express').Router();
const c = require('./../payments/payments.controller');

router.post('/payments/auto-assign', c.autoAssign);
router.post('/assign', c.assignManual);
router.get('/unidentified', c.getUnidentified);
router.get('/transfer-incomes', c.getTransferIncomes);

router.post('/match', c.matchPayment);

router.get('/communities/:communityId/unassigned', c.getUnassignedIncomesByCommunity);

router.post('/auto-assign-transfers', c.autoAssignTransfers);
router.post('/unidentified/apply', c.applyUnidentifiedAmount);
router.put('/unidentified/allocate', c.allocateUnidentified);

module.exports = router;
