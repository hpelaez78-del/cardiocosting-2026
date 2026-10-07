const pool = require('../config/db');

class FinancialService {
  /**
   * Consulta los equipos biomédicos asociados a una sede y sus exámenes vinculados
   */
  async getEquiposBySede(sedeId) {
    const query = `
      SELECT 
        e.id, 
        e.sede_id, 
        e.nombre, 
        e.valor_compra, 
        e.vida_util_meses, 
        e.costo_mantenimiento_anual, 
        e.minutos_disponibles_mes,
        e.ubicacion_estimada,
        se.id AS servicio_equipo_id, 
        se.examen_id, 
        se.tiempo_uso_minutos,
        ex.nombre AS nombre_examen, 
        ex.codigo_cups
      FROM equipos e
      LEFT JOIN servicio_equipo se ON e.id = se.equipo_id
      LEFT JOIN examenes ex ON se.examen_id = ex.id
      WHERE e.sede_id = $1
      ORDER BY e.id DESC;
    `;
    const { rows } = await pool.query(query, [sedeId]);

    // Agrupar los exámenes asignados por equipo
    const equiposMap = {};

    rows.forEach(row => {
      if (!equiposMap[row.id]) {
        equiposMap[row.id] = {
          id: row.id,
          sede_id: row.sede_id,
          nombre: row.nombre,
          valor_compra: Number(row.valor_compra || 0),
          vida_util_meses: Number(row.vida_util_meses || 0),
          costo_mantenimiento_anual: Number(row.costo_mantenimiento_anual || 0),
          minutos_disponibles_mes: Number(row.minutos_disponibles_mes || 0),
          ubicacion_estimada: row.ubicacion_estimada,
          servicio_equipo: []
        };
      }

      if (row.servicio_equipo_id) {
        equiposMap[row.id].servicio_equipo.push({
          id: row.servicio_equipo_id,
          examen_id: row.examen_id,
          tiempo_uso_minutos: Number(row.tiempo_uso_minutos || 0),
          examenes: {
            nombre: row.nombre_examen,
            codigo_cups: row.codigo_cups
          }
        });
      }
    });

    return Object.values(equiposMap);
  }

  /**
   * Transacción para guardar el equipo y crear su relación en servicio_equipo
   */
  async createEquipoConAsignacion(equipoData, examenId, tiempoUsoMinutos) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { 
        sede_id, 
        nombre, 
        valor_compra, 
        vida_util_meses, 
        costo_mantenimiento_anual, 
        minutos_disponibles_mes 
      } = equipoData;

      const eqQuery = `
        INSERT INTO equipos (sede_id, nombre, valor_compra, vida_util_meses, costo_mantenimiento_anual, minutos_disponibles_mes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const eqRes = await client.query(eqQuery, [
        sede_id, 
        nombre, 
        Number(valor_compra), 
          Number(vida_util_meses), 
        Number(costo_mantenimiento_anual || 0), 
          Number(minutos_disponibles_mes)
      ]);
      const nuevoEquipo = eqRes.rows[0];

      if (examenId) {
        const relQuery = `
          INSERT INTO servicio_equipo (equipo_id, examen_id, tiempo_uso_minutos)
          VALUES ($1, $2, $3);
        `;
        await client.query(relQuery, [nuevoEquipo.id, examenId, Number(tiempoUsoMinutos)]);
      }

      await client.query('COMMIT');
      return nuevoEquipo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un equipo por ID (por CASCADE borra las relaciones en servicio_equipo)
   */
  async deleteEquipo(equipoId) {
    const query = 'DELETE FROM equipos WHERE id = $1;';
    const result = await pool.query(query, [equipoId]);
    return result.rowCount > 0;
  }
}

module.exports = new FinancialService();