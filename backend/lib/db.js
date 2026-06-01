const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGODB_URI || "mongodb://mongo:27017";
const mongoDbName = process.env.MONGODB_DB || "hydropay";
const transactionCollectionName =
  process.env.MONGODB_COLLECTION || "transactions";

let clientPromise;
let transactionsCollection;
let indexesReady = false;

function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(mongoUri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function getTransactionsCollection() {
  if (transactionsCollection) {
    return transactionsCollection;
  }

  const client = await getClient();
  transactionsCollection = client
    .db(mongoDbName)
    .collection(transactionCollectionName);

  return transactionsCollection;
}

async function ensureTransactionIndexes() {
  if (indexesReady) {
    return;
  }

  const collection = await getTransactionsCollection();
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ id: 1 }, { unique: true });
  indexesReady = true;
}

async function connectDatabase() {
  await ensureTransactionIndexes();
  console.log(`MongoDB terhubung ke ${mongoDbName}.${transactionCollectionName}`);
}

module.exports = {
  connectDatabase,
  ensureTransactionIndexes,
  getTransactionsCollection,
};
