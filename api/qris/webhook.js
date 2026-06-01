const { sendJson, setCorsHeaders, readJsonBody } = require("../../backend/lib/http");
const { publishOnce } = require("../../backend/lib/mqtt");

module.exports = async function handler(req, res) {
  if (setCorsHeaders(req, res)) {
    return;
  }

  // Webhooks are usually POST
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const paymentData = await readJsonBody(req);

    // Validate payment status (matches Midtrans/Xendit settlement status)
    if (paymentData.transaction_status === "settlement" || paymentData.status === "PAID") {
      console.log(`Pembayaran berhasil untuk TRX: ${paymentData.order_id || paymentData.transactionId}`);

      // Notify ESP32 via MQTT to dispense water
      const topic = process.env.MQTT_TOPIC_COMMAND || "hydropay/command";
      const payload = JSON.stringify({
        action: "DISPENSE",
        amount: 200, // Default dispense amount
        transactionId: paymentData.order_id || paymentData.transactionId,
      });

      await publishOnce(topic, payload);
      
      console.log(`Perintah DISPENSE dikirim ke ${topic}`);
      return sendJson(res, 200, { status: "OK", message: "Command sent to hardware" });
    }

    sendJson(res, 400, { status: "Failed or Pending", message: "Payment not completed" });
  } catch (error) {
    console.error("Webhook error:", error);
    sendJson(res, 500, { error: "Internal server error" });
  }
};
