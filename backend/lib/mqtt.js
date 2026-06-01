const mqtt = require("mqtt");

/**
 * Publishes a single message to an MQTT topic and disconnects.
 * This is suitable for serverless functions where we don't want
 * a persistent connection.
 */
async function publishOnce(topic, message) {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    throw new Error("MQTT_BROKER_URL is not defined");
  }

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(brokerUrl, {
      connectTimeout: 5000,
    });

    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT publish timeout"));
    }, 10000);

    client.on("connect", () => {
      client.publish(topic, message, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        client.end(true);
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });
}

module.exports = {
  publishOnce,
};
