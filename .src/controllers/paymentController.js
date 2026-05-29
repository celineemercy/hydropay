const mqttClient = require('../config/mqttClient');

// Mock up: Fungsi untuk frontend meminta QRIS
exports.generateQris = async (req, res) => {
    const { itemId, price } = req.body;
    // Logika request ke Payment Gateway asli (Midtrans/Xendit) akan ada di sini

    res.json({
        success: true,
        message: "QRIS berhasil dibuat (Mock)",
        data: {
            transactionId: "TRX-" + Date.now(),
            qrString: "000201010211...QRIS_STRING_DUMMY...",
            amount: price
        }
    });
};

// Webhook untuk menerima notifikasi dari Payment Gateway
exports.handleWebhook = (req, res) => {
    const paymentData = req.body;

    // Validasi apakah status pembayaran sukses (disesuaikan dengan response gateway)
    // Contoh sederhana:
    if (paymentData.transaction_status === 'settlement' || paymentData.status === 'PAID') {
        console.log(`Pembayaran berhasil untuk TRX: ${paymentData.order_id}`);

        // 1. Kirim perintah ke ESP32 via MQTT untuk mengeluarkan air
        const commandPayload = JSON.stringify({
            action: "DISPENSE",
            amount: 200 // misal: 200 ml
        });

        mqttClient.publish(process.env.MQTT_TOPIC_COMMAND, commandPayload, () => {
            console.log(`Perintah dikeluarkan ke topik ${process.env.MQTT_TOPIC_COMMAND}`);
        });

        // 2. Beri respon 200 OK ke Payment Gateway agar tidak mengirim webhook berulang
        return res.status(200).json({ status: "OK" });
    }

    res.status(400).json({ status: "Failed or Pending" });
};