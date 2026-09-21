const express = require('express');
const router = express.Router();
const { crearConvenio, obtenerConvenios, obtenerTarifasPorConvenio, actualizarTarifa } = require('../controllers/conveniosController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, obtenerConvenios);
router.post('/', verificarToken, verificarRol(['ADMINISTRADOR']), crearConvenio);
router.post('/', verificarToken, verificarRol(['ADMINISTRADOR']), crearConvenio);
router.get('/:convenioId/tarifas', verificarToken, obtenerTarifasPorConvenio);
router.put('/tarifa', verificarToken, verificarRol(['ADMINISTRADOR']), actualizarTarifa);

module.exports = router;