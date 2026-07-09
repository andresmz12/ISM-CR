require('dotenv').config();

// Fallar al arrancar con un mensaje claro, en vez de un 500 en cada login.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: falta la variable de entorno JWT_SECRET');
  process.exit(1);
}
if (!process.env.CORS_ORIGIN) {
  console.warn('ADVERTENCIA: CORS_ORIGIN no está definido; se aceptará cualquier origen (solo recomendable en desarrollo)');
}

const app = require('./app');

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`ISM CRM backend listening on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
});
