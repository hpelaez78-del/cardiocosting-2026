const { Pool } = require('pg');
require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.error(`[FATAL] Variables de entorno no configuradas: ${missing.join(', ')}`);
    process.exit(1);
}

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[DB] Error inesperado en cliente del pool:', err.message);
});

const ensurePermissionsSchema = async () => {
    await pool.query(`
        ALTER TABLE roles
        ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{}'::jsonb;
    `);
};

const ensureEquipmentPermissions = async () => {
    await pool.query(`
        UPDATE roles
        SET permisos = jsonb_set(
            COALESCE(permisos, '{}'::jsonb),
            '{equipos}',
            COALESCE(permisos->'sedes', '{}'::jsonb),
            true
        )
        WHERE NOT (COALESCE(permisos, '{}'::jsonb) ? 'equipos');
    `);
};

const ensureSedeAreas = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sede_areas (
            id BIGSERIAL PRIMARY KEY,
            sede_id VARCHAR(20) NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
            nombre VARCHAR(100) NOT NULL,
            m2 NUMERIC(10, 2) NOT NULL DEFAULT 0,
            es_directo BOOLEAN NOT NULL DEFAULT FALSE,
            costo_asignado_directo NUMERIC(12, 2) NOT NULL DEFAULT 0
        );
    `);
};

const ensureEquiposSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS equipos (
            id BIGSERIAL PRIMARY KEY,
            sede_id VARCHAR(20) NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
            nombre VARCHAR(150) NOT NULL,
            valor_compra NUMERIC(14, 2) NOT NULL,
            vida_util_meses INTEGER NOT NULL,
            costo_mantenimiento_anual NUMERIC(14, 2) NOT NULL DEFAULT 0,
            minutos_disponibles_mes INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS servicio_equipo (
            id BIGSERIAL PRIMARY KEY,
            equipo_id BIGINT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
            examen_id VARCHAR(50) NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
            tiempo_uso_minutos NUMERIC(8, 2) NOT NULL
        );

        ALTER TABLE equipos
        ADD COLUMN IF NOT EXISTS ubicacion_estimada BOOLEAN NOT NULL DEFAULT FALSE;
    `);
};

const ensureCostingDataSchema = async () => {
    await pool.query(`
        ALTER TABLE examenes
        ADD COLUMN IF NOT EXISTS capacidad_sala_minutos INTEGER;

        CREATE TABLE IF NOT EXISTS personal_sede (
            id BIGSERIAL PRIMARY KEY,
            sede_id VARCHAR(20) NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
            cargo_key VARCHAR(80) NOT NULL,
            cargo VARCHAR(120) NOT NULL,
            grupo_costeo VARCHAR(20) NOT NULL CHECK (grupo_costeo IN ('medico', 'asistencial', 'administrativo')),
            cantidad INTEGER NOT NULL CHECK (cantidad > 0),
            sueldo_base NUMERIC(12, 2) NOT NULL CHECK (sueldo_base >= 0),
            porcentaje_provisiones NUMERIC(5, 2) NOT NULL CHECK (porcentaje_provisiones >= 0),
            horas_mes NUMERIC(6, 2) NOT NULL CHECK (horas_mes > 0),
            UNIQUE (sede_id, cargo_key)
        );

        CREATE TABLE IF NOT EXISTS equipos_costo_referencia (
            id BIGSERIAL PRIMARY KEY,
            examen_id VARCHAR(50) NOT NULL UNIQUE REFERENCES examenes(id) ON DELETE CASCADE,
            nombre VARCHAR(150) NOT NULL,
            valor_compra NUMERIC(14, 2) NOT NULL CHECK (valor_compra >= 0),
            vida_util_meses INTEGER NOT NULL CHECK (vida_util_meses > 0),
            costo_mantenimiento_anual NUMERIC(14, 2) NOT NULL CHECK (costo_mantenimiento_anual >= 0),
            minutos_disponibles_mes INTEGER NOT NULL CHECK (minutos_disponibles_mes > 0),
            tiempo_uso_minutos NUMERIC(8, 2) NOT NULL CHECK (tiempo_uso_minutos > 0),
            costo_unitario_examen NUMERIC(14, 2) NOT NULL CHECK (costo_unitario_examen >= 0)
        );

        CREATE TABLE IF NOT EXISTS volumen_sede_examen (
            sede_id VARCHAR(20) NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
            examen_id VARCHAR(50) NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
            volumen_mes INTEGER NOT NULL CHECK (volumen_mes >= 0),
            estimado BOOLEAN NOT NULL DEFAULT FALSE,
            metodo_asignacion TEXT,
            PRIMARY KEY (sede_id, examen_id)
        );

        ALTER TABLE volumen_sede_examen
        ADD COLUMN IF NOT EXISTS estimado BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE volumen_sede_examen
        ADD COLUMN IF NOT EXISTS metodo_asignacion TEXT;
    `);
};

const ensureFormulaConfigSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS costing_formula_versions (
            id BIGSERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            config JSONB NOT NULL,
            activa BOOLEAN NOT NULL DEFAULT FALSE,
            created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS costing_formula_one_active_idx
        ON costing_formula_versions (activa)
        WHERE activa = TRUE;
    `);

    await pool.query(`
        INSERT INTO costing_formula_versions (nombre, config, activa)
        SELECT 'Configuración base', $1::jsonb, TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM costing_formula_versions WHERE activa = TRUE
        );
    `, [JSON.stringify({
        labor: { provisionsMode: 'per_role', provisionsPct: 48.5, minutesPerHour: 60 },
        duration: { defaultMode: 'sequential_sum', examModes: {} },
        fixedCost: { allocationMethod: 'practical_capacity', includeRent: true, includeServices: true, includeAdminPayroll: true, includeMaintenance: true },
        supplies: { includeInCost: true },
        equipment: { includeDepreciation: true, includeMaintenance: true },
        tariff: { useSoatWhenContractMissing: true, honorZeroContracted: true }
    })]);

    await pool.query(`
        UPDATE roles
        SET permisos = jsonb_set(
            COALESCE(permisos, '{}'::jsonb),
            '{configuracion}',
            '{"view":false,"edit":false}'::jsonb,
            true
        )
        WHERE NOT (COALESCE(permisos, '{}'::jsonb) ? 'configuracion');
    `);
};

const ensureInsumosSedeSchema = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
            ALTER TABLE insumos_detalle
            ADD COLUMN IF NOT EXISTS sede_id VARCHAR(20);
        `);
        await client.query(`
            DO $migration$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'insumos_detalle_sede_id_fkey'
                ) THEN
                    ALTER TABLE insumos_detalle
                    ADD CONSTRAINT insumos_detalle_sede_id_fkey
                    FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE CASCADE;
                END IF;
            END
            $migration$;
        `);

        await client.query(`
            INSERT INTO insumos_detalle (examen_id, nombre_insumo, cantidad, valor_unitario, sede_id)
            SELECT origen.examen_id, origen.nombre_insumo, origen.cantidad, origen.valor_unitario, sede.id
            FROM insumos_detalle origen
            CROSS JOIN sedes sede
            WHERE origen.sede_id IS NULL;
        `);
        await client.query('DELETE FROM insumos_detalle WHERE sede_id IS NULL;');
        await client.query('CREATE INDEX IF NOT EXISTS insumos_detalle_sede_examen_idx ON insumos_detalle (sede_id, examen_id);');
        await client.query('CREATE UNIQUE INDEX IF NOT EXISTS insumos_detalle_sede_examen_nombre_key ON insumos_detalle (sede_id, examen_id, nombre_insumo);');
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

pool.connect()
    .then(client => {
        console.log('⚡ [DB] Conexión a PostgreSQL (cardiocosting_db) establecida correctamente.');
        client.release();
    })
    .catch(err => {
        console.error('❌ [DB] Error al conectar con la base de datos:', err.message);
    });

module.exports = pool;
module.exports.ensurePermissionsSchema = ensurePermissionsSchema;
module.exports.ensureEquipmentPermissions = ensureEquipmentPermissions;
module.exports.ensureSedeAreas = ensureSedeAreas;
module.exports.ensureEquiposSchema = ensureEquiposSchema;
module.exports.ensureCostingDataSchema = ensureCostingDataSchema;
module.exports.ensureFormulaConfigSchema = ensureFormulaConfigSchema;
module.exports.ensureInsumosSedeSchema = ensureInsumosSedeSchema;