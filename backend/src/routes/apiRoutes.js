const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/authMiddleware');

const { createSede, getSedes, updateSede } = require('../controllers/sedesController');
const { createPersonal, getPersonal, updatePersonal } = require('../controllers/personalController');
const { evaluarSede } = require('../controllers/evaluadorController');
const { simularEscenario } = require('../controllers/simuladorController');
const { getCostosCompat, updateCostoCompat } = require('../controllers/costosController');
const { getExamenes, getInsumos, createInsumo, updateInsumo, deleteInsumo } = require('../controllers/insumosController');
const {
  getRoles,
  createRole,
  getUsuarios,
  createUsuario,
  updateUsuario,
  getPerfil,
  updatePerfil,
} = require('../controllers/usuariosController');

// Middleware JWT
router.use(verificarToken);

// Compatibilidad legacy /api/costos y /api/v1/costos
router.get('/costos', getCostosCompat);
router.put('/costos/:endpoint', updateCostoCompat);
router.put('/costos/:endpoint/:id', updateCostoCompat);

// Rutas Sedes
router.get('/sedes', getSedes);
router.post('/sedes', createSede);
router.put('/sedes/:id', updateSede);

// Rutas Personal
router.get('/personal', getPersonal);
router.post('/personal', createPersonal);
router.put('/personal/:id', updatePersonal);

// Rutas Evaluador y Simulador
router.get('/evaluador/sede/:sedeId', evaluarSede);
router.post('/simulador/escenario', simularEscenario);

// Rutas de Usuarios, Roles y Perfiles
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.get('/perfiles', getRoles);
router.post('/perfiles', createRole);

// IMPORTANTE: Definir las rutas específicas de perfil antes de las rutas con :id
router.get('/usuarios/perfil', getPerfil);
router.put('/usuarios/perfil', updatePerfil);

router.get('/usuarios', getUsuarios);
router.post('/usuarios', createUsuario);
router.put('/usuarios/:id', updateUsuario);

// Rutas de Insumos
router.get('/examenes', getExamenes);
router.get('/insumos', getInsumos);
router.get('/insumos/:examenId', getInsumos);
router.post('/insumos', createInsumo);
router.put('/insumos/:id', updateInsumo);
router.delete('/insumos/:id', deleteInsumo);

module.exports = router;