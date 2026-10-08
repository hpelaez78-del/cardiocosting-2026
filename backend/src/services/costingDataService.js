const db = require('../config/db');
const { prepararDistribucionAreas, calcularBolsaFijaSede } = require('./costEngine');

const cargarDistribucionAreas = async (sedeId, bolsaFija, config = {}) => {
  const result = await db.query(`
    SELECT sa.id, sa.nombre, sa.m2, sa.es_directo, sa.costo_asignado_directo,
           sa.capacidad_minutos, ae.examen_id, ae.minutos,
           COALESCE(e.minutos_medico, 0) AS min_medico,
           COALESCE(e.minutos_asistencial, 0) AS min_asis
    FROM sede_areas sa
    LEFT JOIN area_examen ae ON ae.area_id = sa.id
    LEFT JOIN examenes e ON e.id = ae.examen_id
    WHERE sa.sede_id = $1
    ORDER BY sa.id, ae.examen_id;
  `, [sedeId]);

  const areasById = new Map();
  for (const row of result.rows) {
    if (!areasById.has(String(row.id))) {
      areasById.set(String(row.id), {
        id: row.id,
        nombre: row.nombre,
        m2: row.m2,
        es_directo: row.es_directo,
        costo_asignado_directo: row.costo_asignado_directo,
        capacidad_minutos: row.capacidad_minutos,
        asignaciones: []
      });
    }
    if (row.examen_id !== null) {
      const mode = config.duration?.examModes?.[row.examen_id] || config.duration?.defaultMode || 'sequential_sum';
      const duration = mode === 'concurrent_max'
        ? Math.max(Number(row.min_medico), Number(row.min_asis))
        : Number(row.min_medico) + Number(row.min_asis);
      areasById.get(String(row.id)).asignaciones.push({
        examen_id: row.examen_id,
        minutos: Number(row.minutos),
        duracion_minutos: duration
      });
    }
  }

  const areas = [...areasById.values()];
  const distribution = prepararDistribucionAreas(bolsaFija, areas);
  const assignedMinutes = new Map();
  for (const area of areas) {
    for (const assignment of area.asignaciones) {
      const current = assignedMinutes.get(String(assignment.examen_id)) || { minutes: 0, duration: assignment.duracion_minutos };
      current.minutes += assignment.minutos;
      assignedMinutes.set(String(assignment.examen_id), current);
    }
  }
  distribution.warnings = [...assignedMinutes.entries()]
    .filter(([, value]) => value.duration > 0 && value.minutes > value.duration)
    .map(([examenId, value]) => ({ examenId, minutosAsignados: value.minutes, duracionMinutos: value.duration }));
  return distribution;
};

const cargarCostosEquiposRegistrados = async (sedeId) => {
  const result = await db.query(`
    SELECT se.examen_id,
           SUM((e.valor_compra / e.vida_util_meses / e.minutos_disponibles_mes) * se.tiempo_uso_minutos) AS depreciacion,
           SUM((e.costo_mantenimiento_anual / 12 / e.minutos_disponibles_mes) * se.tiempo_uso_minutos) AS mantenimiento
    FROM equipos e
    JOIN servicio_equipo se ON se.equipo_id = e.id
    WHERE e.sede_id = $1
      AND e.vida_util_meses > 0
      AND e.minutos_disponibles_mes > 0
    GROUP BY se.examen_id;
  `, [sedeId]);
  return result.rows.reduce((map, row) => {
    map[String(row.examen_id)] = {
      equipo_depreciacion_registrada: Number(row.depreciacion) || 0,
      equipo_mantenimiento_registrado: Number(row.mantenimiento) || 0
    };
    return map;
  }, {});
};

const validarCoberturaAreaBased = async (config) => {
  const result = await db.query(`
    SELECT s.id, s.capacidad_sala_minutos, s.arriendo_mensual AS arriendo,
           s.servicios_publicos AS servicios, s.mantenimiento_otros AS mtto,
           COALESCE(p.nomina_admin, 0) AS admin
    FROM sedes s
    LEFT JOIN (
      SELECT sede_id, SUM(cantidad * sueldo_base * (1 + porcentaje_provisiones / 100)) AS nomina_admin
      FROM personal_sede WHERE grupo_costeo = 'administrativo' GROUP BY sede_id
    ) p ON p.sede_id = s.id
    ORDER BY s.id;
  `);
  const faltantes = [];
  for (const sede of result.rows) {
    const distribution = await cargarDistribucionAreas(
      sede.id,
      calcularBolsaFijaSede(sede, config),
      config
    );
    if (Number(sede.capacidad_sala_minutos) <= 0) {
      faltantes.push({ sedeId: sede.id, campo: 'capacidad_sala_minutos' });
    }
    for (const area of distribution.areas) {
      if (area.productiva && area.capacidadMinutos <= 0) {
        faltantes.push({ sedeId: sede.id, areaId: area.id, campo: 'capacidad_minutos' });
      }
    }
    if (distribution.issues.length > 0) {
      faltantes.push(...distribution.issues.map((campo) => ({ sedeId: sede.id, campo })));
    }
  }
  return faltantes;
};

module.exports = { cargarDistribucionAreas, cargarCostosEquiposRegistrados, validarCoberturaAreaBased };