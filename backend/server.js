const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const apiRoutes = require('./src/routes/apiRoutes');
const conveniosRoutes = require('./src/routes/conveniosRoutes');

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
  'http://10.20.4.26:5175',
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

    return isLocalDevHost || isPrivateNetworkHost || host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
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

// Montaje de rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/convenios', conveniosRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, async () => {
  try {
    await db.ensureDefaultRoles();
    await db.ensureDefaultConvenio();
    console.log(`Servidor Backend ejecutándose en http://localhost:${PORT}`);
  } catch (error) {
    console.error('[BOOT] No se pudo asegurar la configuración base del sistema:', error.message);
    console.log(`Servidor Backend ejecutándose en http://localhost:${PORT}`);
  }
});