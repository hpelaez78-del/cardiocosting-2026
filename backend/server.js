const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const apiRoutes = require('./src/routes/apiRoutes');
const conveniosRoutes = require('./src/routes/conveniosRoutes');

// Carga condicional de personalRoutes si existe como archivo separado
let personalRoutes;
try {
  personalRoutes = require('./src/routes/personalRoutes');
} catch (e) {
  personalRoutes = null;
}

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no está definido. Configúralo en tu archivo .env.');
  process.exit(1);
}

const defaultAllowedOrigins = [
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://0.0.0.0:5175',
  'http://[::1]:5175',
  'http://10.20.4.26:5175'
];

const allowedOrigins = [...new Set([
  ...defaultAllowedOrigins,
  ...(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
])];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const host = url.host;

    const isLocalDevHost = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(hostname);
    const isVercelHost = hostname.endsWith('.vercel.app');
    const isPrivateNetworkHost =
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.');

    return isLocalDevHost || isVercelHost || isPrivateNetworkHost || host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Log de peticiones entrantes para identificar rutas faltantes en consola
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// Montaje de rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/convenios', conveniosRoutes);

if (personalRoutes) {
  app.use('/api/v1/personal', personalRoutes);
}

app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  console.warn(`[404 NOT FOUND] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador global de errores (500) - Muestra el detalle del error para depuración
app.use((err, req, res, next) => {
  console.error('[ERROR 500]', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    detalle: err.message || err 
  });
});

const startServer = async () => {
  try {
    await db.ensurePermissionsSchema();
    await db.ensureEquipmentPermissions();
    await db.ensureSedeAreas();
    await db.ensureEquiposSchema();
    await db.ensureCostingDataSchema();
    await db.ensureInsumosSedeSchema();
    await db.ensureFormulaConfigSchema();
  } catch (error) {
    console.error('[BOOT] No se pudo asegurar la configuración base del sistema:', error.message);
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => {
    console.log(`Servidor Backend ejecutándose en http://localhost:${PORT}`);
  });
};

startServer();