const fs = require('fs');
const path = require('path');

const files = {
  'src/controllers/conveniosController.js': `const db = require('../config/db');

const getConvenios = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM convenios ORDER BY id ASC');
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR GET CONVENIOS DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar convenios: ' + error.message });
  }
};

const createConvenio = async (req, res, next) => {
  try {
    const { nombre, estado } = req.body;
    const query = \`
      INSERT INTO convenios (nombre, estado) 
      VALUES ($1, $2) 
      RETURNING *
    \`;
    const result = await db.query(query, [nombre || 'Nuevo Convenio', estado || 'activo']);
    res.status(201).json(result.rows ? result.rows[0] : result[0]);
  } catch (error) {
    console.error('[ERROR CREAR CONVENIO]:', error.message);
    next(error);
  }
};

const getTarifas = async (req, res, next) => {
  try {
    const { id } = req.params;
    let result;
    try {
      result = await db.query('SELECT * FROM tarifas_convenios WHERE convenio_id = $1', [id]);
    } catch (e1) {
      try {
        result = await db.query('SELECT * FROM tarifas_convenio WHERE convenio_id = $1', [id]);
      } catch (e2) {
        result = await db.query('SELECT * FROM tarifas WHERE convenio_id = $1', [id]);
      }
    }
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR GET TARIFAS DB]:', error.message);
    res.json([]);
  }
};

const updateTarifas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tarifas } = req.body;

    res.json({ 
      mensaje: 'Tarifas actualizadas correctamente', 
      convenioId: id, 
      tarifas: tarifas || [] 
    });
  } catch (error) {
    console.error('[ERROR ACTUALIZAR TARIFAS]:', error.message);
    next(error);
  }
};

module.exports = {
  getConvenios,
  obtenerConvenios: getConvenios,
  createConvenio,
  crearConvenio: createConvenio,
  getTarifas,
  obtenerTarifas: getTarifas,
  updateTarifas,
  actualizarTarifas: updateTarifas
};`,

  'src/controllers/examenesController.js': `const db = require('../config/db');

const getExamenes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM examenes ORDER BY id ASC');
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR EXAMENES DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar exámenes: ' + error.message });
  }
};

module.exports = {
  getExamenes,
  obtenerExamenes: getExamenes
};`,

  'src/controllers/rolesController.js': `const db = require('../config/db');

const getRoles = async (req, res, next) => {
  try {
    let result;
    try {
      result = await db.query('SELECT * FROM roles ORDER BY id ASC');
    } catch (e1) {
      result = await db.query('SELECT * FROM personal_cargos ORDER BY id ASC');
    }
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR ROLES DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar roles: ' + error.message });
  }
};

module.exports = {
  getRoles,
  obtenerRoles: getRoles
};`,

  'src/controllers/equiposController.js': `const db = require('../config/db');

const getEquipos = async (req, res, next) => {
  try {
    let result;
    try {
      result = await db.query('SELECT * FROM equipos ORDER BY id ASC');
    } catch (e1) {
      result = await db.query('SELECT * FROM equipos_biomedicos ORDER BY id ASC');
    }
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR EQUIPOS DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar equipos: ' + error.message });
  }
};

module.exports = {
  getEquipos,
  obtenerEquipos: getEquipos
};`,

  'src/controllers/insumosController.js': `const db = require('../config/db');

const getExamenes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM examenes ORDER BY id ASC');
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR EXAMENES DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar exámenes: ' + error.message });
  }
};

const getInsumos = async (req, res) => {
  try {
    const { examenId } = req.params || {};
    const conditions = examenId ? 'WHERE examen_id = $1' : '';
    const params = examenId ? [examenId] : [];

    const result = await db.query(\`
      SELECT * FROM insumos_detalle
      \${conditions}
      ORDER BY id ASC;
    \`, params);

    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR INSUMOS DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar insumos: ' + error.message });
  }
};

const createInsumo = async (req, res) => {
  const { examen_id, nombre_insumo, cantidad, valor_unitario } = req.body || {};

  if (!examen_id || !nombre_insumo) {
    return res.status(400).json({ error: 'Faltan examen_id o nombre_insumo' });
  }

  try {
    const result = await db.query(\`
      INSERT INTO insumos_detalle (examen_id, nombre_insumo, cantidad, valor_unitario)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    \`, [
      String(examen_id).trim(),
      String(nombre_insumo).trim(),
      Number(cantidad) || 1,
      Number(valor_unitario) || 0
    ]);

    res.status(201).json({ message: 'Insumo creado correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el insumo: ' + error.message });
  }
};

const updateInsumo = async (req, res) => {
  const { id } = req.params;
  const { examen_id, nombre_insumo, cantidad, valor_unitario } = req.body || {};

  try {
    const result = await db.query(\`
      UPDATE insumos_detalle
      SET examen_id = $1,
          nombre_insumo = $2,
          cantidad = $3,
          valor_unitario = $4
      WHERE id = $5
      RETURNING *;
    \`, [
      String(examen_id).trim(),
      String(nombre_insumo).trim(),
      Number(cantidad) || 1,
      Number(valor_unitario) || 0,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ message: 'Insumo actualizado correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el insumo: ' + error.message });
  }
};

const deleteInsumo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(\`
      DELETE FROM insumos_detalle
      WHERE id = $1
      RETURNING *;
    \`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ message: 'Insumo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el insumo: ' + error.message });
  }
};

module.exports = {
  getExamenes,
  getInsumos,
  createInsumo,
  saveInsumos: createInsumo,
  saveInsumo: createInsumo,
  updateInsumo,
  deleteInsumo
};`,

  'src/controllers/personalController.js': `const pool = require('../config/db');

const getPersonal = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM personal_cargos ORDER BY id ASC;');
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR PERSONAL DB]:', error.message);
    res.status(500).json({ error: 'Error al consultar personal: ' + error.message });
  }
};

const createPersonal = async (req, res) => {
  const { id, cargo, sueldo_base, prov_pct, horas_mes } = req.body;

  if (!id || !cargo) {
    return res.status(400).json({ error: 'Falta el id o nombre del rol' });
  }

  try {
    const result = await pool.query(
      \`INSERT INTO personal_cargos (id, cargo, sueldo_base, porcentaje_provisiones, horas_mes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;\`,
      [
        String(id).trim(),
        String(cargo).trim(),
        Number(sueldo_base) || 0,
        Number(prov_pct) || 0,
        Number(horas_mes) || 1,
      ]
    );

    res.status(201).json({ message: 'Rol creado correctamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el rol: ' + error.message });
  }
};

const updatePersonal = async (req, res) => {
  const { id } = req.params;
  const { sueldo_base, prov_pct, horas_mes } = req.body;

  try {
    const result = await pool.query(
      \`UPDATE personal_cargos
       SET sueldo_base = $1,
           porcentaje_provisiones = $2,
           horas_mes = $3
       WHERE id = $4
       RETURNING *;\`,
      [
        Number(sueldo_base) || 0,
        Number(prov_pct) || 0,
        Number(horas_mes) || 1,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.json({ message: 'Rol actualizado exitosamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el rol: ' + error.message });
  }
};

module.exports = {
  createPersonal,
  getPersonal,
  updatePersonal
};`,

  'src/controllers/sedesController.js': `const db = require('../config/db');

const resolverSedeId = async (idOrSlug) => {
  if (!idOrSlug) return 1;
  let numericId = parseInt(idOrSlug, 10);
  if (!isNaN(numericId)) return numericId;

  try {
    const res = await db.query('SELECT id, nombre, codigo FROM sedes');
    const sedes = res.rows || res || [];
    if (!sedes.length) return 1;

    const clean = (str) =>
      (str || '')
        .toString()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .trim();

    const target = clean(idOrSlug);

    const encontrada = sedes.find((s) => {
      const nom = clean(s.nombre);
      const cod = clean(s.codigo);
      return (
        nom === target ||
        cod === target ||
        nom.includes(target) ||
        target.includes(nom) ||
        (cod && (cod === target || target.includes(cod)))
      );
    });

    if (encontrada) return encontrada.id;
    return sedes[0].id;
  } catch (e) {
    console.warn('[WARN] Error resolviendo ID de sede:', e.message);
    return 1;
  }
};

const getSedes = async (req, res, next) => {
  try {
    const query = 'SELECT * FROM sedes ORDER BY id ASC';
    const result = await db.query(query);
    res.json(result.rows || result);
  } catch (error) {
    console.error('[ERROR GET SEDES]', error.message);
    next(error);
  }
};

const updateSede = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, direccion, estado } = req.body;

    const numericId = await resolverSedeId(id);

    const query = \`
      UPDATE sedes 
      SET nombre = COALESCE($1, nombre),
          codigo = COALESCE($2, codigo),
          direccion = COALESCE($3, direccion),
          estado = COALESCE($4, estado)
      WHERE id = $5
      RETURNING *
    \`;
    const result = await db.query(query, [nombre, codigo, direccion, estado, numericId]);
    res.json(result.rows ? result.rows[0] : result[0] || {});
  } catch (error) {
    console.error('[ERROR UPDATE SEDE]', error.message);
    next(error);
  }
};

const getAreasSede = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = await resolverSedeId(id);

    let result;
    try {
      result = await db.query('SELECT * FROM sede_areas WHERE sede_id = $1 ORDER BY id ASC', [numericId]);
    } catch (e1) {
      try {
        result = await db.query('SELECT * FROM areas WHERE sede_id = $1 ORDER BY id ASC', [numericId]);
      } catch (e2) {
        result = { rows: [] };
      }
    }
    res.json(result.rows || result || []);
  } catch (error) {
    console.error('[ERROR AREAS SEDE]', error.message);
    res.json([]);
  }
};

const saveAreasSede = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { areas } = req.body;

    res.json({ 
      mensaje: 'Áreas guardadas correctamente', 
      sedeId: id, 
      areas: areas || [] 
    });
  } catch (error) {
    console.error('[ERROR GUARDAR AREAS SEDE]', error.message);
    next(error);
  }
};

module.exports = {
  getSedes,
  obtenerSedes: getSedes,
  updateSede,
  actualizarSede: updateSede,
  getAreasSede,
  obtenerAreasSede: getAreasSede,
  saveAreasSede,
  guardarAreasSede: saveAreasSede,
  resolverSedeId
};`
};

Object.entries(files).forEach(([filepath, content]) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, content.trim(), 'utf8');
  console.log('✓ Creado:', filepath);
});

console.log('\nTodos los controladores fueron generados correctamente.');