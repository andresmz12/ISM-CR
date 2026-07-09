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
const companyRoutes = require('./routes/companyRoutes');
const dealRoutes = require('./routes/dealRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Railway/producción corre detrás de un proxy: sin esto express-rate-limit
// rechaza el header X-Forwarded-For y todos los usuarios comparten la IP del proxy.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api', limiter);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos, intenta más tarde' } });
app.use('/api/auth/login', loginLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Errores conocidos de Prisma → respuestas útiles en vez de 500 genérico
  if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
  if (err.code === 'P2003') return res.status(409).json({ error: 'Referencia inválida o el registro tiene datos relacionados' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
