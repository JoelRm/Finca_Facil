const router = require('express').Router();
const c = require('./../dashboard/dashboard.controller');

router.get('/filtros', c.getFiltros);
router.get('/kpis', c.getKpis);
router.get('/categorias', c.getCategorias);
router.get('/evolucion', c.getEvolucion);
router.get('/gastos-por-categoria', c.getGastosPorCategoria);
router.get('/movimientos', c.getMovimientos);
router.get('/bancos', c.getBancos);

module.exports = router;
