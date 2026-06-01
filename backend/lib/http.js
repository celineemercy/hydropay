function getAllowedOrigin() {
  return process.env.CORS_ORIGIN || "*";
}

function setCorsHeaders(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin());
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-hydropay-device-key",
  );
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function hasValidHardwareKey(req) {
  const expectedKey = process.env.HARDWARE_API_KEY;

  if (!expectedKey) {
    return true;
  }

  return req.headers["x-hydropay-device-key"] === expectedKey;
}

function sendError(res, error) {
  const statusCode = error.statusCode || 500;

  if (statusCode === 400 && error.issues) {
    sendJson(res, 400, {
      error: error.message,
      issues: error.issues,
    });
    return;
  }

  sendJson(res, statusCode, {
    error: statusCode === 500 ? "Internal server error" : error.message,
  });
}

module.exports = {
  hasValidHardwareKey,
  readJsonBody,
  sendError,
  sendJson,
  setCorsHeaders,
};
