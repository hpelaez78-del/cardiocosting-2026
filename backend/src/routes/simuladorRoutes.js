const express = require('express');
const router = express.Router();
const { 
  ejecutarSimulacion, 
  guardarSimulacion, 
  obtenerHistorialSimulaciones, 
  obtenerDetalleSimulacion 
} = require('../controllers/simuladorController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/simular', verificarToken, ejecutarSimulacion);
router.post('/guardar', verificarToken, guardarSimulacion);
router.get('/historial/:sedeId', verificarToken, obtenerHistorialSimulaciones);
router.get('/historial/detalle/:id', verificarToken, obtenerDetalleSimulacion);

module.exports = router;