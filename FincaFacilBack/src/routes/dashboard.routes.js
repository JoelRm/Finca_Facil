const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/filtros', dashboardController.getFiltros);
router.get('/kpis', dashboardController.getKpis);
router.get('/categorias', dashboardController.getCategorias);
router.get('/evolucion', dashboardController.getEvolucion);
router.get('/gastos-por-categoria', dashboardController.getGastosPorCategoria);
router.get('/movimientos', dashboardController.getMovimientos);
router.get('/bancos', dashboardController.getBancos);
module.exports = router;
