class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function badRequest(code, message) {
  return new HttpError(400, code, message);
}

function notFound(code, message) {
  return new HttpError(404, code, message);
}

function notImplemented(message) {
  return new HttpError(501, "not_implemented", message);
}

function upstream(code, message) {
  return new HttpError(502, code, message);
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
  notImplemented,
  upstream,
};
