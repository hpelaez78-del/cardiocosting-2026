const test = require('node:test');
const assert = require('node:assert/strict');

const usuariosController = require('../src/controllers/usuariosController');

test('usuariosController expone gestión de usuarios, roles y perfil', () => {
  assert.ok(usuariosController.getRoles);
  assert.ok(usuariosController.createRole);
  assert.ok(usuariosController.getUsuarios);
  assert.ok(usuariosController.createUsuario);
  assert.ok(usuariosController.updateUsuario);
  assert.ok(usuariosController.getPerfil);
  assert.ok(usuariosController.updatePerfil);
});

test('usuariosController normaliza permisos con acciones por módulo', () => {
  const permisos = usuariosController.normalizePermisos({
    dashboard: { ver: true, crear: true, editar: false, eliminar: false },
    sedes: { ver: true, crear: false, editar: false, eliminar: false },
  });

  assert.deepEqual(permisos.dashboard, { ver: true, crear: true, editar: false, eliminar: false });
  assert.deepEqual(permisos.sedes, { ver: true, crear: false, editar: false, eliminar: false });
});
