const { sendJson, setCorsHeaders } = require("../backend/lib/http");

module.exports = async function handler(req, res) {
  if (setCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  sendJson(res, 200, { status: "ok" });
};
