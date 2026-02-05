const express = require('express');
const router = express.Router();

const controller = require('../controllers/dashboard.controller');

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ⛔ comenta todo lo demás
router.get('/filtros', controller.getFiltros);
router.get('/kpis', controller.getKpis);
router.get('/categorias', controller.getCategorias);
router.get('/evolucion', controller.getEvolucion);
router.get('/gastos-por-categoria', controller.getGastosPorCategoria);
// router.get('/detalle', controller.getDetalle);

module.exports = router;
