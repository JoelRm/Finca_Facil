const router = require('express').Router();

const dashboardRoutes = require('./dashboard.routes');
const ownersRoutes    = require('./owners.routes');
const syncRoutes      = require('./sync.routes');
const adminRoutes     = require('./admin.routes');
const paymentsRoutes = require('./payments.routes');
const authRoutes = require('./auth.routes');
const bankRoutes = require('./bank.routes');
const demoRoutes = require('./demo.routes');
const communitiesRoutes = require('./communities.routes');

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/', authRoutes);
router.use('/', dashboardRoutes);
router.use('/', ownersRoutes);
router.use('/', syncRoutes);
router.use('/admin', adminRoutes);

router.use('/payments', paymentsRoutes);

router.use('/', bankRoutes);
router.use('/', demoRoutes);
router.use('/', communitiesRoutes);

module.exports = router;
