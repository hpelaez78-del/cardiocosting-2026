const express = require('express');
const router = express.Router();
const { obtenerEvaluacionSede, obtenerConsolidadoMultisitio } = require('../controllers/evaluadorController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/sede/:sedeId', verificarToken, obtenerEvaluacionSede);
router.get('/consolidado', verificarToken, obtenerConsolidadoMultisitio);

module.exports = router;