function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.flatten();
      // Log temporal de diagnóstico: sin esto, el body del 400 solo lo ve
      // quien hizo la petición (nunca queda en los logs del servidor).
      console.error(`[validate] 400 en ${req.method} ${req.originalUrl}:`, JSON.stringify(details));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
