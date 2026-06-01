const { createHardwareTransaction } = require("../../backend/lib/transactions");
const {
  hasValidHardwareKey,
  readJsonBody,
  sendError,
  sendJson,
  setCorsHeaders,
} = require("../../backend/lib/http");

module.exports = async function handler(req, res) {
  if (setCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!hasValidHardwareKey(req)) {
    sendJson(res, 401, { error: "Invalid hardware API key" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const transaction = await createHardwareTransaction(body);

    sendJson(res, 201, {
      ok: true,
      transaction,
    });
  } catch (error) {
    console.error(error);
    sendError(res, error);
  }
};
