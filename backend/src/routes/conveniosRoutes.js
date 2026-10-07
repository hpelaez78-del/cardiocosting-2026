const express = require('express');
const router = express.Router();
const conveniosController = require('../controllers/conveniosController');
const { verificarToken, requirePermiso } = require('../middlewares/authMiddleware');

const getConveniosFn = conveniosController.getConvenios || conveniosController.obtenerConvenios;
const createConvenioFn = conveniosController.createConvenio || conveniosController.crearConvenio;
const getTarifasFn = conveniosController.getTarifas || conveniosController.obtenerTarifas;
const updateTarifasFn = conveniosController.updateTarifas || conveniosController.actualizarTarifas;

// Consultar convenios
router.get(
  '/', 
  verificarToken, 
  requirePermiso('convenios', 'view'),
  getConveniosFn
);

// Crear convenio
router.post(
  '/', 
  verificarToken, 
  requirePermiso('convenios', 'create'),
  createConvenioFn
);

// Consultar tarifas de un convenio
router.get(
  '/:id/tarifas',
  verificarToken,
  requirePermiso('convenios', 'view'),
  getTarifasFn
);

// Actualizar tarifas de un convenio
router.put(
  '/:id/tarifas', 
  verificarToken, 
  requirePermiso('convenios', 'edit'),
  updateTarifasFn
);

module.exports = router;