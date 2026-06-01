const { sendJson, setCorsHeaders, readJsonBody } = require("../../backend/lib/http");

module.exports = async function handler(req, res) {
  if (setCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const { itemId, price } = await readJsonBody(req);
    
    // Mock logic for QRIS generation
    sendJson(res, 200, {
      success: true,
      message: "QRIS berhasil dibuat (Mock)",
      data: {
        transactionId: "TRX-" + Date.now(),
        qrString: "000201010211...QRIS_STRING_DUMMY...",
        amount: price,
      },
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
};
