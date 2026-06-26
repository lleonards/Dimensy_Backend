export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || 'Erro interno no servidor.',
  });
}
