const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const http = require("http");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { Server } = require("socket.io");
const { z } = require("zod");

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

const transactionInputSchema = z.object({
  amount: z.coerce.number().int().positive(),
  status: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(["success", "failed"])),
  details: z.string().trim().min(1).max(500),
});

const mongoUri = process.env.MONGODB_URI || "mongodb://mongo:27017";
const mongoDbName = process.env.MONGODB_DB || "hydropay";
const transactionCollectionName =
  process.env.MONGODB_COLLECTION || "transactions";
const mongoClient = new MongoClient(mongoUri);
let transactionsCollection;

function createTransactionId(date) {
  const compactTimestamp = date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `TRX-${compactTimestamp}-${suffix}`;
}

async function connectDatabase() {
  await mongoClient.connect();
  transactionsCollection = mongoClient
    .db(mongoDbName)
    .collection(transactionCollectionName);

  await transactionsCollection.createIndex({ createdAt: -1 });
  await transactionsCollection.createIndex({ id: 1 }, { unique: true });

  console.log(
    `MongoDB terhubung ke ${mongoDbName}.${transactionCollectionName}`,
  );
}

// TAMBAHKAN BARIS INI: Untuk menampilkan halaman web
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/transactions", async (req, res, next) => {
  try {
    const transactions = await transactionsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.status(200).json({ transactions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/hardware/transactions", async (req, res, next) => {
  try {
    const parsedPayload = transactionInputSchema.safeParse(req.body);

    if (!parsedPayload.success) {
      return res.status(400).json({
        error: "Invalid transaction payload",
        issues: parsedPayload.error.flatten(),
      });
    }

    const now = new Date();
    const transaction = {
      id: createTransactionId(now),
      timestamp: now.toISOString(),
      amount: parsedPayload.data.amount,
      status: parsedPayload.data.status,
      details: parsedPayload.data.details,
      source: "esp32",
      createdAt: now,
    };

    const result = await transactionsCollection.insertOne(transaction);
    const responseTransaction = {
      ...transaction,
      _id: result.insertedId,
    };

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
