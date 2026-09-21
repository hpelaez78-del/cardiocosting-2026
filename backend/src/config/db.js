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

const ensureDefaultRoles = async () => {
    try {
        await pool.query(`
            ALTER TABLE roles
            ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{}'::jsonb;
        `);

        const existing = await pool.query(`
            SELECT id, nombre, permisos
            FROM roles
            WHERE LOWER(TRIM(nombre)) IN ('administrador', 'finanzas', 'coordinador_sede')
            ORDER BY id ASC;
        `);

        const permisosPorDefecto = {
            view: true,
            create: true,
            edit: true,
            delete: true
        };

        const rolesPorDefecto = [
            {
                nombre: 'ADMINISTRADOR',
                descripcion: 'Acceso total y parametrización del sistema',
                permisos: {
                    dashboard: permisosPorDefecto,
                    sedes: permisosPorDefecto,
                    personal: permisosPorDefecto,
                    convenios: permisosPorDefecto,
                    insumos: permisosPorDefecto,
                    simulador: permisosPorDefecto,
                    usuarios: permisosPorDefecto
                }
            },
            {
                nombre: 'FINANZAS',
                descripcion: 'Gestión de tarifas, convenios y simulación',
                permisos: {
                    dashboard: { view: true, create: false, edit: false, delete: false },
                    convenios: permisosPorDefecto,
                    insumos: permisosPorDefecto,
                    simulador: permisosPorDefecto,
                    usuarios: { view: true, create: false, edit: false, delete: false }
                }
            },
            {
                nombre: 'COORDINADOR_SEDE',
                descripcion: 'Consulta y operación por sede',
                permisos: {
                    dashboard: { view: true, create: false, edit: false, delete: false },
                    sedes: { view: true, create: false, edit: true, delete: false },
                    personal: { view: true, create: true, edit: true, delete: false },
                    insumos: { view: true, create: true, edit: true, delete: false }
                }
            }
        ];

        if (existing.rows.length === rolesPorDefecto.length) {
            console.log('[DB] Roles base ya existen en la base de datos.');
            return existing.rows;
        }

        for (const rol of rolesPorDefecto) {
            await pool.query(`
                INSERT INTO roles (nombre, descripcion, permisos)
                VALUES ($1, $2, $3)
                ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion, permisos = EXCLUDED.permisos;
            `, [rol.nombre, rol.descripcion, JSON.stringify(rol.permisos)]);
        }

        console.log('[DB] Roles base creados automáticamente.');
        const result = await pool.query(`
            SELECT id, nombre, descripcion, permisos
            FROM roles
            WHERE LOWER(TRIM(nombre)) IN ('administrador', 'finanzas', 'coordinador_sede')
            ORDER BY id ASC;
        `);

        return result.rows;
    } catch (error) {
        console.error('[DB] Error al asegurar los roles base:', error.message);
        throw error;
    }
};

const ensureDefaultConvenio = async () => {
    try {
        const existing = await pool.query(`
            SELECT id, nombre_eps
            FROM convenios
            WHERE LOWER(TRIM(nombre_eps)) = 'general'
            LIMIT 1;
        `);

        if (existing.rows.length > 0) {
            console.log('[DB] Convenio General ya existe en la base de datos.');
            return existing.rows[0];
        }

        const created = await pool.query(`
            INSERT INTO convenios (nombre_eps, fecha_ultimo_reajuste)
            VALUES ('General', NOW())
            RETURNING *;
        `);

        const convenioId = created.rows[0].id;

        await pool.query(`
            INSERT INTO tarifas_convenios (convenio_id, examen_id, tarifa_acordada)
            SELECT $1, e.id, 0
            FROM examenes e
            WHERE NOT EXISTS (
                SELECT 1
                FROM tarifas_convenios tc
                WHERE tc.convenio_id = $1 AND tc.examen_id = e.id
            );
        `, [convenioId]);

        console.log('[DB] Convenio General creado automáticamente con tarifas iniciales.');
        return created.rows[0];
    } catch (error) {
        console.error('[DB] Error al asegurar el convenio General:', error.message);
        throw error;
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
module.exports.ensureDefaultRoles = ensureDefaultRoles;
module.exports.ensureDefaultConvenio = ensureDefaultConvenio;