const db = require('../src/config/db');

const jobs = [
  ['ibague', 'director_general', 'Director General / Alta Gerencia', 'administrativo', 1, 12000000, 48.5, 160],
  ['ibague', 'director_medico', 'Director Médico', 'administrativo', 1, 9500000, 48.5, 160],
  ['ibague', 'medico_especialista', 'Médico Especialista (Imágenes/Consulta)', 'medico', 2, 7000000, 48.5, 160],
  ['ibague', 'tecnologo_imagenes', 'Tecnólogo en Imágenes / Rayos X', 'asistencial', 2, 2800000, 48.5, 160],
  ['ibague', 'auxiliar_enfermeria', 'Auxiliar de Enfermería', 'asistencial', 2, 1600000, 48.5, 160],
  ['ibague', 'recepcionista', 'Recepcionista / Admisiones', 'administrativo', 2, 1423500, 48.5, 160],
  ['ibague', 'servicios_generales', 'Servicios Generales', 'administrativo', 1, 1423500, 48.5, 160],
  ...['espinal', 'honda', 'chaparral'].flatMap((sedeId) => [
    [sedeId, 'medico_especialista', 'Médico Especialista', 'medico', 1, 7000000, 48.5, 160],
    [sedeId, 'tecnologo_imagenes', 'Tecnólogo en Imágenes / Rayos X', 'asistencial', 1, 2800000, 48.5, 160],
    [sedeId, 'auxiliar_enfermeria', 'Auxiliar de Enfermería', 'asistencial', 1, 1600000, 48.5, 160],
    [sedeId, 'recepcionista', 'Recepcionista / Admisiones', 'administrativo', 1, 1423500, 48.5, 160],
    [sedeId, 'servicios_generales', 'Servicios Generales', 'administrativo', 1, 1423500, 48.5, 160]
  ])
];

const examCapacities = [
  ['eco_estres', 11520],
  ['eco_te', 10800],
  ['eco_tt', 11520],
  ['holter_ritmo', 11520],
  ['mapa', 11520],
  ['p_esfuerzo', 11520],
  ['consulta', 12240],
  ['rehabilitacion', 11520],
  ['ekg', 11520],
  ['till_test', 10800]
];

const equipment = [
  ['eco_tt', 'Ecocardiógrafo Doppler Transtorácico', 220000000, 84, 15000000, 11520, 30],
  ['eco_te', 'Ecocardiógrafo 3D con Sonda Transesofágica', 280000000, 84, 20000000, 10800, 45],
  ['eco_estres', 'Sistema Ecocardiógrafo de Estrés', 250000000, 84, 18000000, 11520, 45],
  ['ekg', 'Electrocardiógrafo Digital de 12 Canales', 15000000, 60, 1200000, 11520, 15],
  ['holter_ritmo', 'Sistema de Holter de Arritmias (Grabadoras + Licencia)', 35000000, 60, 3000000, 11520, 20],
  ['mapa', 'Sistema de Monitoreo MAPA (Presión Arterial)', 28000000, 60, 2500000, 11520, 15],
  ['p_esfuerzo', 'Sistema Ergométrico para Prueba de Esfuerzo', 85000000, 84, 6500000, 11520, 40],
  ['till_test', 'Camilla Basculante Motorizada para Tilt Test', 45000000, 120, 3500000, 10800, 60],
  ['rehabilitacion', 'Central de Telemetría y Monitoreo de Rehabilitación', 95000000, 84, 7500000, 11520, 60],
  ['consulta', 'Kit Diagnóstico Avanzado de Consultorio / POCUS', 22000000, 60, 1800000, 12240, 20]
];

const supplies = [
  ['mapa', 'Pilas Alcalinas AA', 2, 3500],
  ['mapa', 'Fundas protectoras brazalete', 1, 1500],
  ['mapa', 'Cinta Quirúrgica / Fixomull', 1, 1207],
  ['till_test', 'Toallas', 2, 20],
  ['till_test', 'Desechables', 1, 500],
  ['till_test', 'Electrodo', 10, 357],
  ['till_test', 'Isordil', 1, 930],
  ['till_test', 'Papel Carta', 5, 40],
  ['till_test', 'Sobre Carta', 1, 500],
  ['eco_estres', 'Yelco', 1, 1265],
  ['eco_estres', 'Llave de 3 Vías', 1, 654],
  ['eco_estres', 'E. Anestesia', 1, 738],
  ['eco_estres', 'E. Bomba', 0.1, 18999],
  ['eco_estres', 'Jeringa 10', 1, 193],
  ['eco_estres', 'Jeringa 1 CC', 1, 143],
  ['eco_estres', 'Isopañin', 1, 77],
  ['eco_estres', 'Toallas', 2, 20],
  ['eco_estres', 'Desechables', 0.2, 500],
  ['eco_estres', 'Electrodo', 3, 357],
  ['eco_estres', 'Dobutamina', 0.5, 1200],
  ['eco_estres', 'Atropina', 2, 599],
  ['eco_estres', 'Metoprolol Amp', 0.1, 10301],
  ['eco_estres', 'Dipiridamol', 7, 6250],
  ['eco_estres', 'SSN 100 CC', 0.1, 1689],
  ['eco_estres', 'Papel Carta', 5, 40],
  ['eco_estres', 'Sobre MC', 1, 250],
  ['eco_te', 'C. Nasal', 0.1, 1500],
  ['eco_te', 'Isopañin', 2, 77],
  ['eco_te', 'Toallas', 2, 20],
  ['eco_te', 'Desechables', 0.2, 500],
  ['eco_te', 'Papel Carta', 5, 40],
  ['eco_te', 'Sobre MC', 1, 250],
  ['eco_tt', 'Isopañin', 1, 77],
  ['eco_tt', 'Toallas', 1, 20],
  ['eco_tt', 'Desechables', 0.1, 500],
  ['eco_tt', 'Papel Carta', 10, 40],
  ['eco_tt', 'Sobre MC', 1, 250],
  ['holter_ritmo', 'Desechables', 0.2, 500],
  ['holter_ritmo', 'Electrodo', 4, 357],
  ['holter_ritmo', 'Papel Carta', 6, 40],
  ['holter_ritmo', 'Sobre Carta', 1, 500],
  ['mapa', 'Desechables', 1, 500],
  ['mapa', 'Papel Carta', 5, 40],
  ['mapa', 'Sobre Carta', 1, 500],
  ['p_esfuerzo', 'Isopañin', 2, 77],
  ['p_esfuerzo', 'Toallas', 1, 20],
  ['p_esfuerzo', 'Desechables', 0.1, 500],
  ['p_esfuerzo', 'Electrodo', 10, 357],
  ['p_esfuerzo', 'Papel Carta', 10, 40],
  ['p_esfuerzo', 'Sobre Carta', 1, 500],
  ['consulta', 'Papel Carta', 10, 40],
  ['consulta', 'Sobre MC', 1, 250],
  ['rehabilitacion', 'Isopañin', 1, 77],
  ['rehabilitacion', 'Toallas', 0.1, 20],
  ['rehabilitacion', 'Desechables', 0.1, 500],
  ['rehabilitacion', 'Electrodo', 5, 357],
  ['rehabilitacion', 'Papel Carta', 1, 40],
  ['ekg', 'Electrodo', 1, 357],
  ['ekg', 'Papel Carta', 3, 40],
  ['ekg', 'Sobre MC', 1, 250]
];

const seed = async () => {
  await db.ensureEquiposSchema();
  await db.ensureCostingDataSchema();
  await db.ensureInsumosSedeSchema();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const [sedeId, cargoKey, cargo, grupo, cantidad, sueldo, provisiones, horas] of jobs) {
      await client.query(`
        INSERT INTO personal_sede
          (sede_id, cargo_key, cargo, grupo_costeo, cantidad, sueldo_base, porcentaje_provisiones, horas_mes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (sede_id, cargo_key) DO UPDATE SET
          cargo = EXCLUDED.cargo,
          grupo_costeo = EXCLUDED.grupo_costeo,
          cantidad = EXCLUDED.cantidad,
          sueldo_base = EXCLUDED.sueldo_base,
          porcentaje_provisiones = EXCLUDED.porcentaje_provisiones,
          horas_mes = EXCLUDED.horas_mes;
      `, [sedeId, cargoKey, cargo, grupo, cantidad, sueldo, provisiones, horas]);
    }

    for (const [examenId, capacity] of examCapacities) {
      const result = await client.query(
        'UPDATE examenes SET capacidad_sala_minutos = $1 WHERE id = $2 RETURNING id;',
        [capacity, examenId]
      );
      if (result.rowCount !== 1) throw new Error(`Examen no encontrado: ${examenId}`);
    }

    const siteRows = await client.query('SELECT id FROM sedes ORDER BY id');
    for (const site of siteRows.rows) {
      for (const [examenId, name, quantity, unitValue] of supplies) {
        await client.query(`
          INSERT INTO insumos_detalle (sede_id, examen_id, nombre_insumo, cantidad, valor_unitario)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (sede_id, examen_id, nombre_insumo) DO NOTHING;
        `, [site.id, examenId, name, quantity, unitValue]);
      }
    }

    for (const [examenId, name, purchaseValue, usefulLife, annualMaintenance, availableMinutes, examMinutes] of equipment) {
      const monthlyEquipmentCost = purchaseValue / usefulLife + annualMaintenance / 12;
      const unitCost = monthlyEquipmentCost * examMinutes / availableMinutes;
      await client.query(`
        INSERT INTO equipos_costo_referencia
          (examen_id, nombre, valor_compra, vida_util_meses, costo_mantenimiento_anual,
           minutos_disponibles_mes, tiempo_uso_minutos, costo_unitario_examen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (examen_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          valor_compra = EXCLUDED.valor_compra,
          vida_util_meses = EXCLUDED.vida_util_meses,
          costo_mantenimiento_anual = EXCLUDED.costo_mantenimiento_anual,
          minutos_disponibles_mes = EXCLUDED.minutos_disponibles_mes,
          tiempo_uso_minutos = EXCLUDED.tiempo_uso_minutos,
          costo_unitario_examen = EXCLUDED.costo_unitario_examen;
      `, [examenId, name, purchaseValue, usefulLife, annualMaintenance, availableMinutes, examMinutes, unitCost]);
      await client.query(
        'UPDATE examenes SET costo_depreciacion_equipos = $1 WHERE id = $2;',
        [unitCost, examenId]
      );

      const existingEquipo = await client.query(
        'SELECT id FROM equipos WHERE sede_id = $1 AND nombre = $2 ORDER BY id LIMIT 1;',
        ['ibague', name]
      );
      let equipoId = existingEquipo.rows[0]?.id;
      if (equipoId) {
        await client.query(`
          UPDATE equipos
          SET valor_compra = $1, vida_util_meses = $2,
              costo_mantenimiento_anual = $3, minutos_disponibles_mes = $4,
              ubicacion_estimada = TRUE
          WHERE id = $5;
        `, [purchaseValue, usefulLife, annualMaintenance, availableMinutes, equipoId]);
      } else {
        const createdEquipo = await client.query(`
          INSERT INTO equipos
            (sede_id, nombre, valor_compra, vida_util_meses, costo_mantenimiento_anual, minutos_disponibles_mes, ubicacion_estimada)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE)
          RETURNING id;
        `, ['ibague', name, purchaseValue, usefulLife, annualMaintenance, availableMinutes]);
        equipoId = createdEquipo.rows[0].id;
      }

      const existingService = await client.query(
        'SELECT id FROM servicio_equipo WHERE equipo_id = $1 AND examen_id = $2 ORDER BY id LIMIT 1;',
        [equipoId, examenId]
      );
      if (existingService.rows[0]) {
        await client.query('UPDATE servicio_equipo SET tiempo_uso_minutos = $1 WHERE id = $2;', [examMinutes, existingService.rows[0].id]);
      } else {
        await client.query(
          'INSERT INTO servicio_equipo (equipo_id, examen_id, tiempo_uso_minutos) VALUES ($1, $2, $3);',
          [equipoId, examenId, examMinutes]
        );
      }
    }

    const [siteResult, examResult] = await Promise.all([
      client.query('SELECT id, volumen_mensual_esperado FROM sedes ORDER BY id'),
      client.query('SELECT id, volumen_mes_proyectado FROM examenes ORDER BY id')
    ]);
    const networkVolume = examResult.rows.reduce((sum, row) => sum + Number(row.volumen_mes_proyectado || 0), 0);
    if (networkVolume <= 0) throw new Error('No hay volumen global por examen para distribuir');

    for (const site of siteResult.rows) {
      const siteVolume = Number(site.volumen_mensual_esperado || 0);
      const allocations = examResult.rows.map((exam) => {
        const exact = siteVolume * Number(exam.volumen_mes_proyectado || 0) / networkVolume;
        const volume = Math.floor(exact);
        return { examId: exam.id, volume, remainder: exact - volume };
      });
      const remaining = siteVolume - allocations.reduce((sum, item) => sum + item.volume, 0);
      const remainderOrder = [...allocations].sort((left, right) => right.remainder - left.remainder || left.examId.localeCompare(right.examId));
      for (let index = 0; index < remaining; index += 1) remainderOrder[index].volume += 1;

      for (const item of allocations) {
        await client.query(`
          INSERT INTO volumen_sede_examen (sede_id, examen_id, volumen_mes, estimado, metodo_asignacion)
          VALUES ($1, $2, $3, TRUE, $4)
          ON CONFLICT (sede_id, examen_id) DO UPDATE SET
            volumen_mes = EXCLUDED.volumen_mes,
            estimado = TRUE,
            metodo_asignacion = EXCLUDED.metodo_asignacion
          WHERE volumen_sede_examen.estimado = TRUE;
        `, [site.id, item.examId, item.volume, 'Prorrateado del volumen mensual de la sede según la mezcla global de exámenes']);
      }
    }

    await client.query('COMMIT');
    console.log(`Cargos por sede cargados: ${jobs.length}`);
    console.log(`Insumos por sede cargados: ${supplies.length * siteRows.rows.length}`);
    console.log(`Capacidades por examen cargadas: ${examCapacities.length}`);
    console.log(`Costos estándar de equipo cargados: ${equipment.length}`);
    console.log(`Equipos físicos ubicados en Ibagué (estimado): ${equipment.length}`);
    console.log(`Volúmenes por sede/examen estimados: ${siteResult.rows.length * examResult.rows.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

seed()
  .catch((error) => {
    console.error('No se pudieron cargar los datos de costeo:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
