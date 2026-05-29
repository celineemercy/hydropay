require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

// Inisialisasi MQTT agar berjalan bersama server
require('./config/mqttClient');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Untuk memparsing body request format JSON

// Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend Dispenser berjalan di http://localhost:${PORT}`);
});