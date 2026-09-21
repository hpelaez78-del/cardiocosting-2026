const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const normalizeRoleName = (value) => String(value || '').trim();

const normalizePermisos = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => String(key).trim())
      .filter(Boolean);
  }

  return [];
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
  return Boolean(value);
};

const resolveRoleIdValue = async (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue) && String(value).trim() !== '') {
    return numericValue;
  }

  const nombreRol = normalizeRoleName(value).toUpperCase();
  if (!nombreRol) {
    return null;
  }

  const result = await pool.query(
    `SELECT id FROM roles WHERE UPPER(TRIM(nombre)) = $1 LIMIT 1;`,
    [nombreRol]
  );

  return result.rows[0]?.id ?? null;
};

const getRoles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, descripcion, permisos
      FROM roles
      ORDER BY id ASC;
    `);

    res.json(result.rows.map((rol) => ({
      ...rol,
      permisos: Array.isArray(rol.permisos) ? rol.permisos : (rol.permisos ? JSON.parse(JSON.stringify(rol.permisos)) : [])
    })));
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar roles: ' + error.message });
  }
};

const createRole = async (req, res) => {
  const { nombre, descripcion, permisos } = req.body || {};
  const nombreNormalizado = normalizeRoleName(nombre);

  if (!nombreNormalizado) {
    return res.status(400).json({ error: 'El nombre del rol es obligatorio.' });
  }

  try {
    const permisosNormalizados = typeof permisos === 'object' && permisos !== null ? permisos : {};
    const result = await pool.query(
      `INSERT INTO roles (nombre, descripcion, permisos)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, descripcion, permisos;`,
      [nombreNormalizado.toUpperCase(), descripcion ? String(descripcion).trim() : null, JSON.stringify(permisosNormalizados)]
    );

    res.status(201).json({ message: 'Rol creado correctamente', data: result.rows[0] });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre.' });
    }

    res.status(500).json({ error: 'Error al crear el rol: ' + error.message });
  }
};

const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.activo,
        u.role_id,
        r.nombre AS rol_nombre,
        u.sede_id,
        s.nombre AS sede_nombre
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN sedes s ON s.id = u.sede_id
      ORDER BY u.id ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar usuarios: ' + error.message });
  }
};

const createUsuario = async (req, res) => {
  const {
    nombre,
    email,
    password,
    role_id,
    roleId,
    perfil_id,
    perfilId,
    permiso_id,
    permisoId,
    perfil,
    permiso,
    sede_id,
    sedeId,
    activo,
  } = req.body || {};

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
  }

  try {
    const passwordHash = await bcrypt.hash(String(password), 10);
    const roleIdValue = await resolveRoleIdValue(role_id ?? roleId ?? perfil_id ?? perfilId ?? permiso_id ?? permisoId ?? perfil ?? permiso ?? null);
    const sedeIdValue = sede_id ?? sedeId ?? null;
    const activoValue = parseBoolean(activo ?? true);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, role_id, sede_id, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, email, role_id, sede_id, activo;`,
      [String(nombre).trim(), String(email).trim(), passwordHash, roleIdValue !== null ? Number(roleIdValue) : null, sedeIdValue ? String(sedeIdValue).trim() : null, activoValue]
    );

    res.status(201).json({ message: 'Usuario creado correctamente', data: result.rows[0] });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    res.status(500).json({ error: 'Error al crear el usuario: ' + error.message });
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    email,
    password,
    role_id,
    roleId,
    perfil_id,
    perfilId,
    permiso_id,
    permisoId,
    perfil,
    permiso,
    sede_id,
    sedeId,
    activo,
  } = req.body || {};

  try {
    const campos = [];
    const valores = [];
    let index = 1;

    if (nombre !== undefined) {
      campos.push(`nombre = $${index++}`);
      valores.push(String(nombre).trim());
    }

    if (email !== undefined) {
      campos.push(`email = $${index++}`);
      valores.push(String(email).trim());
    }

    if (password) {
      campos.push(`password_hash = $${index++}`);
      valores.push(await bcrypt.hash(String(password), 10));
    }

    const resolvedRoleId = await resolveRoleIdValue(role_id ?? roleId ?? perfil_id ?? perfilId ?? permiso_id ?? permisoId ?? perfil ?? permiso);
    if (role_id !== undefined || roleId !== undefined || perfil_id !== undefined || perfilId !== undefined || permiso_id !== undefined || permisoId !== undefined || perfil !== undefined || permiso !== undefined) {
      campos.push(`role_id = $${index++}`);
      valores.push(resolvedRoleId === null ? null : Number(resolvedRoleId));
    }

    const resolvedSedeId = sede_id ?? sedeId;
    if (resolvedSedeId !== undefined) {
      campos.push(`sede_id = $${index++}`);
      valores.push(resolvedSedeId === null || resolvedSedeId === '' ? null : String(resolvedSedeId).trim());
    }

    if (activo !== undefined) {
      campos.push(`activo = $${index++}`);
      valores.push(parseBoolean(activo));
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'No se enviaron cambios para actualizar.' });
    }

    valores.push(id);
    const result = await pool.query(
      `UPDATE usuarios
       SET ${campos.join(', ')}
       WHERE id = $${index}
       RETURNING id, nombre, email, role_id, sede_id, activo;`,
      valores
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Usuario actualizado correctamente', data: result.rows[0] });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    res.status(500).json({ error: 'Error al actualizar el usuario: ' + error.message });
  }
};

const getPerfil = async (req, res) => {
  const usuarioId = req.usuario?.id || req.params?.id;

  if (!usuarioId) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.activo,
        u.role_id,
        r.nombre AS rol_nombre,
        u.sede_id,
        s.nombre AS sede_nombre
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN sedes s ON s.id = u.sede_id
      WHERE u.id = $1;
    `, [usuarioId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar perfil: ' + error.message });
  }
};

const updatePerfil = async (req, res) => {
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const { nombre, email, password, activo } = req.body || {};
  const payload = { nombre, email, password, activo };
  return updateUsuario({ params: { id: String(usuarioId) }, body: payload }, res);
};

module.exports = {
  getRoles,
  createRole,
  getUsuarios,
  createUsuario,
  updateUsuario,
  getPerfil,
  updatePerfil,
};
