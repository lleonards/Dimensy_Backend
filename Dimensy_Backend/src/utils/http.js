export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
