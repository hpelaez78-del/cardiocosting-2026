const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!jwtSecret) {
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta operación' });
    }
    next();
  };
};

module.exports = { verificarToken, verificarRol };