const db = require('../config/db');
const formulaConfigService = require('../services/formulaConfigService');
const { calcularBolsaFijaSede } = require('../services/costEngine');

const resolverSedeId = async (idOrSlug) => {
  if (!idOrSlug) return null;
  const result = await db.query(
    `SELECT id FROM sedes
     WHERE id::text = $1 OR LOWER(nombre) = LOWER($1)
     LIMIT 1;`,
    [String(idOrSlug).trim()]
  );
  return result.rows[0]?.id || null;
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
    const numericId = await resolverSedeId(id);
    const { arriendo, servicios, mtto, volumen, capacidad_sala_minutos } = req.body;

    if (!numericId) return res.status(404).json({ error: 'Sede no encontrada' });

    const query = `
      UPDATE sedes 
      SET arriendo_mensual = $1,
          servicios_publicos = $2,
          mantenimiento_otros = $3,
          volumen_mensual_esperado = $4,
          capacidad_sala_minutos = CASE WHEN $6 THEN $5 ELSE capacidad_sala_minutos END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      RETURNING *
    `;
    const result = await db.query(query, [
      Number(arriendo) || 0,
      Number(servicios) || 0,
      Number(mtto) || 0,
      Number(volumen) || 0,
      Number(capacidad_sala_minutos) > 0 ? Number(capacidad_sala_minutos) : null,
      Object.hasOwn(req.body || {}, 'capacidad_sala_minutos'),
      numericId
    ]);
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[ERROR UPDATE SEDE]', error.message);
    next(error);
  }
};

const getAreasSede = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sedeId = await resolverSedeId(id);
    if (!sedeId) return res.status(404).json({ error: 'Sede no encontrada' });

    const activeConfig = await formulaConfigService.readActiveFormulaConfig();
    const result = await db.query(
      `SELECT sa.*, ae.examen_id, ae.minutos,
              e.nombre AS examen_nombre,
              COALESCE(e.minutos_medico, 0) AS minutos_medico,
              COALESCE(e.minutos_asistencial, 0) AS minutos_asistencial
       FROM sede_areas sa
       LEFT JOIN area_examen ae ON ae.area_id = sa.id
       LEFT JOIN examenes e ON e.id = ae.examen_id
       WHERE sa.sede_id = $1
       ORDER BY sa.id ASC, ae.examen_id ASC`,
      [sedeId]
    );
    const examenesResult = await db.query(`
      SELECT id, nombre, minutos_medico, minutos_asistencial
      FROM examenes
      ORDER BY nombre ASC;
    `);
    const areas = new Map();
    for (const row of result.rows) {
      if (!areas.has(String(row.id))) {
        areas.set(String(row.id), { ...row, asignaciones: [] });
      }
      if (row.examen_id !== null) {
        const mode = activeConfig.config.duration.examModes[row.examen_id]
          || activeConfig.config.duration.defaultMode;
        const duration = mode === 'concurrent_max'
          ? Math.max(Number(row.minutos_medico), Number(row.minutos_asistencial))
          : Number(row.minutos_medico) + Number(row.minutos_asistencial);
        areas.get(String(row.id)).asignaciones.push({
          examen_id: row.examen_id,
          examen_nombre: row.examen_nombre,
          minutos: Number(row.minutos),
          minutos_medico: Number(row.minutos_medico),
          minutos_asistencial: Number(row.minutos_asistencial),
          duracion_examen_minutos: duration
        });
      }
    }
    res.json({
      areas: [...areas.values()].map(({ examen_id, minutos, examen_nombre, minutos_medico, minutos_asistencial, ...area }) => area),
      fixedCost: activeConfig.config.fixedCost,
      examenes: examenesResult.rows
    });
  } catch (error) {
    console.error('[ERROR AREAS SEDE]', error.message);
    next(error);
  }
};

const saveAreasSede = async (req, res, next) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { areas } = req.body;
    const sedeId = await resolverSedeId(id);
    if (!sedeId) return res.status(404).json({ error: 'Sede no encontrada' });
    if (!Array.isArray(areas)) return res.status(400).json({ error: 'El campo areas debe ser una lista' });
    const invalidArea = areas.find((area) => {
      const m2 = Number(area.m2 ?? 0);
      const directCost = Number(area.costoAsignadoDirecto ?? area.costo_asignado_directo ?? 0);
      const capacity = area.capacidadMinutos ?? area.capacidad_minutos;
      return !String(area.nombre || '').trim()
        || !Number.isFinite(m2) || m2 < 0
        || !Number.isFinite(directCost) || directCost < 0
        || (capacity !== undefined && capacity !== null && capacity !== '' && (!Number.isFinite(Number(capacity)) || Number(capacity) <= 0));
    });
    if (invalidArea) return res.status(400).json({ error: 'Cada área debe tener nombre, m² y sub-bolsa válidos; la capacidad debe ser positiva cuando se informa.' });

    const sedeRes = await client.query(`
      SELECT arriendo_mensual AS arriendo, servicios_publicos AS servicios,
             mantenimiento_otros AS mtto,
             COALESCE((SELECT SUM(cantidad * sueldo_base * (1 + porcentaje_provisiones / 100))
                       FROM personal_sede WHERE sede_id = sedes.id AND grupo_costeo = 'administrativo'), 0) AS admin
      FROM sedes WHERE id = $1;
    `, [sedeId]);
    const activeConfig = await formulaConfigService.readActiveFormulaConfig();
    const bolsaFija = calcularBolsaFijaSede(sedeRes.rows[0] || {}, activeConfig.config);
    const directas = areas
      .filter((area) => Boolean(area.esDirecto ?? area.es_directo))
      .reduce((total, area) => total + (Number(area.costoAsignadoDirecto ?? area.costo_asignado_directo) || 0), 0);
    if (directas > bolsaFija + 0.005) {
      return res.status(400).json({ error: 'La suma de sub-bolsas directas supera la bolsa fija de la sede.' });
    }

    await client.query('BEGIN');
    const persistedIds = [];
    for (const area of areas) {
      const values = [
        String(area.nombre || '').trim(),
        Number(area.m2) || 0,
        Boolean(area.esDirecto ?? area.es_directo),
        Number(area.costoAsignadoDirecto ?? area.costo_asignado_directo) || 0,
        Number(area.capacidadMinutos ?? area.capacidad_minutos) > 0
          ? Number(area.capacidadMinutos ?? area.capacidad_minutos)
          : null
      ];
      const requestedId = Number(area.id);
      let areaId;
      if (Number.isInteger(requestedId) && requestedId > 0) {
        const updated = await client.query(
          `UPDATE sede_areas
           SET nombre = $1, m2 = $2, es_directo = $3, costo_asignado_directo = $4, capacidad_minutos = $5
           WHERE id = $6 AND sede_id = $7 RETURNING id;`,
          [...values, requestedId, sedeId]
        );
        areaId = updated.rows[0]?.id;
      }
      if (!areaId) {
        const inserted = await client.query(
          `INSERT INTO sede_areas (sede_id, nombre, m2, es_directo, costo_asignado_directo, capacidad_minutos)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
          [sedeId, ...values]
        );
        areaId = inserted.rows[0].id;
      }
      persistedIds.push(areaId);
      await client.query('DELETE FROM area_examen WHERE area_id = $1', [areaId]);
      for (const assignment of area.asignaciones || []) {
        const minutes = Number(assignment.minutos);
        if (!assignment.examen_id || !Number.isFinite(minutes) || minutes <= 0) {
          throw Object.assign(new Error('Cada asignación debe incluir examen y minutos mayores que cero.'), { statusCode: 400 });
        }
        await client.query(
          `INSERT INTO area_examen (area_id, examen_id, minutos) VALUES ($1, $2, $3);`,
          [areaId, assignment.examen_id, minutes]
        );
      }
    }
    await client.query(
      'DELETE FROM sede_areas WHERE sede_id = $1 AND NOT (id = ANY($2::bigint[]));',
      [sedeId, persistedIds]
    );
    await client.query('COMMIT');
    res.json({ mensaje: 'Áreas guardadas correctamente', sedeId, areas: areas.map((area, index) => ({ ...area, id: persistedIds[index] })) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ERROR GUARDAR AREAS SEDE]', error.message);
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    next(error);
  } finally {
    client.release();
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
};