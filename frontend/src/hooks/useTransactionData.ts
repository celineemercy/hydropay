import { useMemo, useState } from "react";

export type TransactionStatus = "success" | "failed";

export interface Transaction {
  id: string;
  timestamp: string;
  status: TransactionStatus;
  amount: number;
  details: string;
}

export interface TransactionMetrics {
  successCount: number;
  failedCount: number;
  totalCount: number;
}

export interface UseTransactionDataResult {
  transactions: Transaction[];
  metrics: TransactionMetrics;
}

const initialTransactions: Transaction[] = [
  {
    id: "TRX-20260506-001",
    timestamp: "2026-05-06T08:10:22+07:00",
    status: "success",
    amount: 5000,
    details: "QRIS payment accepted - 200 ml dispensed",
  },
  {
    id: "TRX-20260506-002",
    timestamp: "2026-05-06T08:17:43+07:00",
    status: "failed",
    amount: 5000,
    details: "Payment expired before dispense command",
  },
  {
    id: "TRX-20260506-003",
    timestamp: "2026-05-06T08:26:11+07:00",
    status: "success",
    amount: 10000,
    details: "QRIS payment accepted - 500 ml dispensed",
  },
  {
    id: "TRX-20260506-004",
    timestamp: "2026-05-06T08:31:09+07:00",
    status: "success",
    amount: 5000,
    details: "Manual retry completed",
  },
  {
    id: "TRX-20260506-005",
    timestamp: "2026-05-06T08:39:56+07:00",
    status: "failed",
    amount: 10000,
    details: "Gateway rejected duplicate transaction",
  },
];

export function useTransactionData(): UseTransactionDataResult {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  /*
   * Future WebSocket integration:
   *
   * 1. Install the client in this frontend app:
   *    npm install socket.io-client
   *
   * 2. Import it here:
   *    import { io } from "socket.io-client";
   *
   * 3. Add a useEffect below the useState call:
   *    useEffect(() => {
   *      const socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8086");
   *
   *      socket.on("transaction:update", (payload: Transaction) => {
   *        setTransactions((current) => [payload, ...current].slice(0, 20));
   *      });
   *
   *      return () => socket.disconnect();
   *    }, []);
   *
   * 4. On the Node backend, emit "transaction:update" when your ESP32/Arduino,
   *    MQTT listener, payment webhook, or LCD workflow produces a new status:
   *    io.emit("transaction:update", transactionPayload);
   *
   * Alternative API polling/fetch integration:
   * - Create an endpoint such as GET /api/transactions in Express.
   * - Add a useEffect here that calls fetch("/api/transactions"), validates the
   *   JSON shape, then calls setTransactions(data).
   * - For near-real-time updates without sockets, repeat the fetch with setInterval.
   */

  const metrics = useMemo<TransactionMetrics>(() => {
    return transactions.reduce<TransactionMetrics>(
      (summary, transaction) => {
        if (transaction.status === "success") {
          summary.successCount += 1;
        } else {
          summary.failedCount += 1;
        }

        summary.totalCount += 1;
        return summary;
      },
      {
        successCount: 0,
        failedCount: 0,
        totalCount: 0,
      },
    );
  }, [transactions]);

  return {
    transactions,
    metrics,
  };
}
