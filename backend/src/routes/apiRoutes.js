const express = require('express');
const router = express.Router();

const { verificarToken, requirePermiso } = require('../middlewares/authMiddleware');
const authController = require('../controllers/authController');
const usuariosController = require('../controllers/usuariosController');
const insumosController = require('../controllers/insumosController');
const conveniosController = require('../controllers/conveniosController');
const sedesController = require('../controllers/sedesController');
const evaluadorController = require('../controllers/evaluadorController');
const simuladorController = require('../controllers/simuladorController');
const personalController = require('../controllers/personalController');
const rolesController = require('../controllers/rolesController');
const examenesController = require('../controllers/examenesController');
const costosController = require('../controllers/costosController');
const formulaConfigController = require('../controllers/formulaConfigController');

// --- RUTA PÚBLICA DE AUTENTICACIÓN ---
router.post('/auth/login', authController.login);

// --- TODAS LAS DEMÁS RUTAS PROTEGIDAD POR TOKEN JWT ---
router.use(verificarToken);

// 1. Usuarios y Perfil
const getPerfilFn = usuariosController.getPerfil || usuariosController.obtenerPerfil;
router.get('/usuarios/perfil', requirePermiso('usuarios', 'view'), getPerfilFn);
router.put('/usuarios/perfil', requirePermiso('usuarios', 'edit'), usuariosController.updatePerfil);
router.get('/usuarios', requirePermiso('usuarios', 'view'), usuariosController.getUsuarios || usuariosController.obtenerUsuarios);
router.post('/usuarios', requirePermiso('usuarios', 'create'), usuariosController.createUsuario || usuariosController.crearUsuario);
router.put('/usuarios/:id', requirePermiso('usuarios', 'edit'), usuariosController.updateUsuario || usuariosController.actualizarUsuario);
router.delete('/usuarios/:id', requirePermiso('usuarios', 'delete'), usuariosController.deleteUsuario || usuariosController.eliminarUsuario);

// 2. Roles
const getRolesFn = rolesController.getRoles || rolesController.obtenerRoles;
router.get('/roles', requirePermiso('usuarios', 'view'), getRolesFn);
router.post('/roles', requirePermiso('usuarios', 'create'), usuariosController.createRole);

// 3. Personal
const getPersonalFn = personalController.getPersonal || personalController.obtenerPersonal;
router.get('/personal', requirePermiso('personal', 'view'), getPersonalFn);
router.post('/personal', requirePermiso('personal', 'create'), personalController.createPersonal || personalController.crearPersonal);
router.put('/personal/:id', requirePermiso('personal', 'edit'), personalController.updatePersonal || personalController.actualizarPersonal);

// 4. Exámenes
const getExamenesFn = examenesController.getExamenes || examenesController.obtenerExamenes;
router.get('/examenes', requirePermiso('equipos', 'view'), getExamenesFn);

// 5. Equipos
router.get('/equipos/:sede', requirePermiso('equipos', 'view'), costosController.getEquipos);
router.post('/equipos', requirePermiso('equipos', 'create'), costosController.createEquipo);
router.delete('/equipos/:id', requirePermiso('equipos', 'delete'), costosController.deleteEquipo);

// 6. Insumos
router.get('/insumos', requirePermiso('insumos', 'view'), insumosController.getInsumos);
router.post('/insumos', requirePermiso('insumos', 'create'), insumosController.createInsumo || insumosController.saveInsumos);
router.put('/insumos/:id', requirePermiso('insumos', 'edit'), insumosController.updateInsumo);
router.delete('/insumos/:id', requirePermiso('insumos', 'delete'), insumosController.deleteInsumo);

// 7. Convenios y Tarifas
router.get('/convenios', requirePermiso('convenios', 'view'), conveniosController.getConvenios || conveniosController.obtenerConvenios);
router.post('/convenios', requirePermiso('convenios', 'create'), conveniosController.createConvenio || conveniosController.crearConvenio);
router.get('/convenios/:id/tarifas', requirePermiso('convenios', 'view'), conveniosController.getTarifas || conveniosController.obtenerTarifas);
router.put('/convenios/:id/tarifas', requirePermiso('convenios', 'edit'), conveniosController.updateTarifas || conveniosController.actualizarTarifas);

// 8. Sedes y Áreas por sede
router.get('/sedes', requirePermiso('sedes', 'view'), sedesController.getSedes || sedesController.obtenerSedes);
router.put('/sedes/:id', requirePermiso('sedes', 'edit'), sedesController.updateSede || sedesController.actualizarSede);
router.get('/sedes/:id/areas', requirePermiso('sedes', 'view'), sedesController.getAreasSede || sedesController.obtenerAreasSede);
router.post('/sedes/:id/areas', requirePermiso('sedes', 'edit'), sedesController.saveAreasSede || sedesController.guardarAreasSede);

// 9. Evaluador y Simulador
const evalFn = evaluadorController.evaluarSede || evaluadorController.getEvaluacionSede || evaluadorController.obtenerEvaluacionSede;
router.get('/evaluador/sede/:sedeId', requirePermiso('dashboard', 'view'), evalFn);
router.get('/evaluador/:sedeId', requirePermiso('dashboard', 'view'), evalFn);

const simFn = simuladorController.simularEscenario;
router.post('/simulador/escenario', requirePermiso('simulador', 'create'), simFn);
router.post('/simulador/simular', requirePermiso('simulador', 'create'), simFn);

router.get('/configuracion-costeo', requirePermiso('configuracion', 'view'), formulaConfigController.getFormulaConfig);
router.post('/configuracion-costeo/preview', requirePermiso('configuracion', 'view'), formulaConfigController.previewFormulaConfig);
router.post('/configuracion-costeo', requirePermiso('configuracion', 'edit'), formulaConfigController.saveFormulaConfig);
router.post('/configuracion-costeo/:id/activar', requirePermiso('configuracion', 'edit'), formulaConfigController.activateFormulaVersion);

module.exports = router;