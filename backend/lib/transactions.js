const { z } = require("zod");
const { ensureTransactionIndexes, getTransactionsCollection } = require("./db");

const transactionInputSchema = z.object({
  amount: z.coerce.number().int().positive(),
  status: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(["success", "failed"])),
  details: z.string().trim().min(1).max(500),
});

function createTransactionId(date) {
  const compactTimestamp = date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `TRX-${compactTimestamp}-${suffix}`;
}

async function listTransactions({ limit = 50 } = {}) {
  await ensureTransactionIndexes();
  const collection = await getTransactionsCollection();

  return collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

async function createHardwareTransaction(payload) {
  const parsedPayload = transactionInputSchema.safeParse(payload);

  if (!parsedPayload.success) {
    const error = new Error("Invalid transaction payload");
    error.statusCode = 400;
    error.issues = parsedPayload.error.flatten();
    throw error;
  }

  await ensureTransactionIndexes();
  const collection = await getTransactionsCollection();
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

  const result = await collection.insertOne(transaction);

  return {
    ...transaction,
    _id: result.insertedId,
  };
}

module.exports = {
  createHardwareTransaction,
  listTransactions,
  transactionInputSchema,
};
