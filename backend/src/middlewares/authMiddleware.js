const jwt = require('jsonwebtoken');
const pool = require('../config/db'); 

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_cardiocosting';

/**
 * Middleware para validar el JWT en la cabecera Authorization
 */
const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // CORREGIDO: Se reemplaza 'username' por 'nombre, email'
    const userRes = await pool.query(
      'SELECT id, nombre, email, role_id, activo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado. Sesión finalizada.' });
    }

    req.user = {
      ...decoded,
      role_id: userRes.rows[0].role_id,
      activo: userRes.rows[0].activo
    };

    next();
  } catch (error) {
    console.error('Error en verificarToken:', error.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware dinámico para validar permisos por Módulo y Acción en BD
 * @param {string} modulo - Nombre del módulo ('usuarios', 'insumos', 'convenios', 'sedes', etc.)
 * @param {string} accion - Acción requerida ('ver', 'crear', 'editar', 'eliminar')
 */
const requirePermiso = (modulo, accion) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(403).json({ error: 'Acceso denegado: Usuario sin rol asignado.' });
      }

      const query = `
        SELECT nombre, permisos
        FROM roles 
        WHERE id = $1;
      `;
      const roleRes = await pool.query(query, [req.user.role_id]);

      if (roleRes.rows.length === 0) {
        return res.status(403).json({ error: 'Acceso denegado: Rol no existente.' });
      }

      const rol = roleRes.rows[0];
      if (String(rol.nombre).trim().toUpperCase() === 'ADMINISTRADOR') return next();

      let permisos = rol.permisos || {};
      if (typeof permisos === 'string') {
        try {
          permisos = JSON.parse(permisos);
        } catch {
          permisos = {};
        }
      }
      const permisosModulo = permisos[modulo] || {};

      const accionesCompatibles = {
        view: ['view', 'ver'],
        create: ['create', 'crear'],
        edit: ['edit', 'editar'],
        delete: ['delete', 'eliminar']
      };
      const claves = accionesCompatibles[accion] || [accion];
      const tienePermiso = claves.some((clave) => Boolean(permisosModulo[clave]));

      if (!tienePermiso) {
        return res.status(403).json({ 
          error: `Acceso denegado: No tiene permisos de '${accion}' en el módulo '${modulo}'.` 
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Error al verificar permisos: ' + error.message });
    }
  };
};

module.exports = {
  verificarToken,
  requirePermiso
};