// Express 4 no propaga promesas rechazadas al error handler global,
// así que todo controller async debe envolverse con esto.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function wrapAll(controllers) {
  return Object.fromEntries(
    Object.entries(controllers).map(([name, fn]) => [name, typeof fn === 'function' ? asyncHandler(fn) : fn])
  );
}

module.exports = { asyncHandler, wrapAll };
