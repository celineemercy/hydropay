const mqtt = require('mqtt');
require('dotenv').config();

const client = mqtt.connect(process.env.MQTT_BROKER_URL);

client.on('connect', () => {
    console.log(`Berhasil terhubung ke MQTT Broker: ${process.env.MQTT_BROKER_URL}`);
    // Subscribe ke topik status dari ESP32
    client.subscribe(process.env.MQTT_TOPIC_STATUS, (err) => {
        if (!err) {
            console.log(`Subscribed ke topik: ${process.env.MQTT_TOPIC_STATUS}`);
        }
    });
});

client.on('message', (topic, message) => {
    if (topic === process.env.MQTT_TOPIC_STATUS) {
        console.log(`[Status dari ESP32]: ${message.toString()}`);
        // Di sini nanti kamu bisa teruskan status ke Frontend via WebSocket
    }
});

module.exports = client;