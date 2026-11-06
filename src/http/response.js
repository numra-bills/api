function sendSuccess(res, data, meta) {
  return res.json({
    success: true,
    data,
    meta,
  });
}

function sendError(res, error) {
  const status = error.status || 500;
  const body = {
    success: false,
    error: {
      code: error.code || "internal_error",
      message: status === 500 ? "Internal server error" : error.message,
    },
  };
  if (status === 500 && error.message) body.error.detail = error.message;
  return res.status(status).json(body);
}

export { sendSuccess, sendError };
