const db = require('../config/db');

const crearConvenio = async (req, res) => {
  const { nombre_eps, fecha_ultimo_reajuste } = req.body;

  if (!nombre_eps) {
    return res.status(400).json({ error: 'Falta el nombre del convenio' });
  }

  try {
    await db.query(
      `SELECT setval(pg_get_serial_sequence('convenios', 'id'), COALESCE((SELECT MAX(id) FROM convenios), 0), true);`
    );

    const convenio = await db.query(
      `INSERT INTO convenios (nombre_eps, fecha_ultimo_reajuste)
       VALUES ($1, $2)
       RETURNING *;`,
      [String(nombre_eps).trim(), fecha_ultimo_reajuste || null]
    );

    const examenes = await db.query(`SELECT id FROM examenes ORDER BY nombre ASC;`);

    for (const examen of examenes.rows) {
      await db.query(
        `INSERT INTO tarifas_convenios (convenio_id, examen_id, tarifa_acordada)
         VALUES ($1, $2, 0);`,
        [convenio.rows[0].id, examen.id]
      );
    }

    res.status(201).json({ message: 'Convenio creado correctamente', data: convenio.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el convenio: ' + error.message });
  }
};

const obtenerConvenios = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM convenios ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerTarifasPorConvenio = async (req, res) => {
  try {
    const { convenioId } = req.params;
    const result = await db.query(
      `SELECT tc.id, tc.examen_id, e.codigo_cups, e.nombre as examen, tc.tarifa_acordada
       FROM tarifas_convenios tc
       JOIN examenes e ON tc.examen_id = e.id
       WHERE tc.convenio_id = $1
       ORDER BY e.nombre ASC`,
      [convenioId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const actualizarTarifa = async (req, res) => {
  try {
    const { convenio_id, examen_id, nueva_tarifa } = req.body;

    const existente = await db.query(
      `SELECT id FROM tarifas_convenios WHERE convenio_id = $1 AND examen_id = $2;`,
      [convenio_id, examen_id]
    );

    let result;
    if (existente.rows.length > 0) {
      result = await db.query(
        `UPDATE tarifas_convenios
         SET tarifa_acordada = $2
         WHERE id = $1
         RETURNING *;`,
        [existente.rows[0].id, nueva_tarifa]
      );
    } else {
      result = await db.query(
        `INSERT INTO tarifas_convenios (convenio_id, examen_id, tarifa_acordada)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [convenio_id, examen_id, nueva_tarifa]
      );
    }

    res.json({ message: 'Tarifa actualizada correctamente', tarifa: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  crearConvenio,
  obtenerConvenios,
  obtenerTarifasPorConvenio,
  actualizarTarifa
};