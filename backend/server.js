const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { connectDatabase } = require("./lib/db");
const {
  createHardwareTransaction,
  listTransactions,
} = require("./lib/transactions");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
});

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "32kb" }));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip}`);
  }

  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/transactions", async (req, res, next) => {
  try {
    const transactions = await listTransactions();

    res.status(200).json({ transactions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/hardware/transactions", async (req, res, next) => {
  try {
    const expectedHardwareKey = process.env.HARDWARE_API_KEY;

    if (
      expectedHardwareKey &&
      req.get("x-hydropay-device-key") !== expectedHardwareKey
    ) {
      return res.status(401).json({ error: "Invalid hardware API key" });
    }

    const responseTransaction = await createHardwareTransaction(req.body);

    io.emit("transaction:update", responseTransaction);

    res.status(201).json({
      ok: true,
      transaction: responseTransaction,
    });
  } catch (error) {
    next(error);
  }
});

io.on("connection", (socket) => {
  console.log(`Node terhubung: ${socket.id}`);

  socket.on("klik_tombol", () => {
    console.log("Sinyal masuk! Meneruskan...");
    io.emit("ganti_layar", "AKTIF");
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.statusCode === 400 && error.issues) {
    return res.status(400).json({
      error: error.message,
      issues: error.issues,
    });
  }

  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8086;
const HOST = process.env.HOST || "0.0.0.0";

connectDatabase()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Server berjalan di http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Gagal menjalankan backend:", error);
    process.exit(1);
  });
