const db = require('../config/db');
const bcrypt = require('bcryptjs');

const normalizePermisos = (value) => {
  let permissions = value;
  if (typeof permissions === 'string') {
    try {
      permissions = JSON.parse(permissions);
    } catch {
      return {};
    }
  }
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return {};

  return Object.fromEntries(Object.entries(permissions).map(([moduleName, actions]) => {
    if (!actions || typeof actions !== 'object' || Array.isArray(actions)) return [moduleName, {}];
    return [moduleName, {
      ver: Boolean(actions.ver ?? actions.view),
      crear: Boolean(actions.crear ?? actions.create),
      editar: Boolean(actions.editar ?? actions.edit),
      eliminar: Boolean(actions.eliminar ?? actions.delete)
    }];
  }));
};

const getUsuarios = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.nombre, u.email, u.role_id, u.sede_id, u.activo,
             r.nombre AS rol, s.nombre AS sede
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN sedes s ON s.id = u.sede_id
      ORDER BY u.id ASC;
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getRoles = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, nombre, descripcion, permisos FROM roles ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const { nombre, descripcion, permisos = {} } = req.body;
    if (!String(nombre || '').trim()) return res.status(400).json({ error: 'El nombre del rol es obligatorio' });
    const result = await db.query(`
      INSERT INTO roles (nombre, descripcion, permisos)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, descripcion, permisos;
    `, [String(nombre).trim(), descripcion || null, JSON.stringify(permisos)]);
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const createUsuario = async (req, res, next) => {
  try {
    const { nombre, email, password, role_id, sede_id, activo = true } = req.body;
    if (!String(nombre || '').trim() || !String(email || '').trim() || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(`
      INSERT INTO usuarios (nombre, email, password_hash, role_id, sede_id, activo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, email, role_id, sede_id, activo;
    `, [String(nombre).trim(), String(email).trim().toLowerCase(), passwordHash, role_id || null, sede_id || null, Boolean(activo)]);
    res.status(201).json({ usuario: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const fields = [];
    const values = [];
    const addField = (column, value) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    for (const field of ['nombre', 'email', 'role_id', 'sede_id', 'activo']) {
      if (Object.hasOwn(req.body, field)) {
        addField(field, field === 'email' ? String(req.body[field] || '').trim().toLowerCase() : req.body[field]);
      }
    }
    if (req.body.password) addField('password_hash', await bcrypt.hash(req.body.password, 12));
    if (!fields.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

    values.push(req.params.id);
    const result = await db.query(`
      UPDATE usuarios SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, nombre, email, role_id, sede_id, activo;
    `, values);
    if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id: result.rows[0].id });
  } catch (error) {
    next(error);
  }
};

const getPerfil = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.nombre, u.email, u.role_id, u.sede_id, u.activo,
             r.nombre AS rol, r.permisos
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1;
    `, [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updatePerfil = async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;
    const values = [String(nombre || '').trim(), String(email || '').trim().toLowerCase()];
    let passwordAssignment = '';
    if (password) {
      values.push(await bcrypt.hash(password, 12));
      passwordAssignment = `, password_hash = $${values.length}`;
    }
    values.push(req.user.id);
    const result = await db.query(`
      UPDATE usuarios
      SET nombre = $1, email = $2${passwordAssignment}
      WHERE id = $${values.length}
      RETURNING id, nombre, email, role_id, sede_id, activo;
    `, values);
    if (!result.rowCount) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsuarios,
  obtenerUsuarios: getUsuarios,
  getRoles,
  createRole,
  normalizePermisos,
  getPerfil,
  obtenerPerfil: getPerfil,
  updatePerfil,
  createUsuario,
  crearUsuario: createUsuario,
  updateUsuario,
  actualizarUsuario: updateUsuario,
  deleteUsuario,
  eliminarUsuario: deleteUsuario
};