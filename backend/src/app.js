const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const statusRoutes = require('./routes/statusRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const pickupRequestRoutes = require('./routes/pickupRequestRoutes');
const callRoutes = require('./routes/callRoutes');
const emailRoutes = require('./routes/emailRoutes');
const companyRoutes = require('./routes/companyRoutes');
const dealRoutes = require('./routes/dealRoutes');
const reportRoutes = require('./routes/reportRoutes');
const projectRoutes = require('./routes/projectRoutes');
const savedFilterRoutes = require('./routes/savedFilterRoutes');
const searchRoutes = require('./routes/searchRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');

const app = express();

// Railway/producción corre detrás de un proxy: sin esto express-rate-limit
// rechaza el header X-Forwarded-For y todos los usuarios comparten la IP del proxy.
app.set('trust proxy', 1);

app.use(helmet());
// Sin CORS_ORIGIN definido: en producción no se refleja ningún origen (bloqueado
// por default, nunca '*' con credentials); en desarrollo se permite cualquiera
// para no fricasear el flujo local.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins ?? (process.env.NODE_ENV === 'production' ? false : true),
  credentials: true,
}));
// Se guardan los bytes crudos del body para poder verificar la firma HMAC
// de webhooks externos (RECOGIDA-PAQ) antes de que Express los reserialice.
// 10mb: da margen para el import masivo de contactos (hasta 5000 filas por
// request) sin afectar la subida de adjuntos, que tiene su propio límite (multer).
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api', limiter);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos, intenta más tarde' } });
app.use('/api/auth/login', loginLimiter);

// Límite propio para las rutas de integración autenticadas por API key: una llave
// filtrada no debería poder usarse para scraping masivo bajo el límite genérico
// (1000 req/15min compartido por toda /api).
const integrationsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, keyGenerator: (req) => req.headers['x-api-key'] || req.ip });
app.use('/api/integrations/clients', integrationsLimiter);
app.use('/api/integrations/leads', integrationsLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Deben ir antes de /api/integrations: ese router aplica requireApiKey a todo
// lo que cuelgue de él, y estos webhooks usan autenticación HMAC en su lugar.
app.use('/api/integrations/pickup-requests', pickupRequestRoutes);
app.use('/api/integrations/calls', callRoutes);
app.use('/api/integrations/emails', emailRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/saved-filters', savedFilterRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/api-keys', apiKeyRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Errores conocidos de Prisma → respuestas útiles en vez de 500 genérico
  if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
  if (err.code === 'P2003') return res.status(409).json({ error: 'Referencia inválida o el registro tiene datos relacionados' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El archivo supera el límite de 5 MB' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
