import { useEffect, useMemo, useState } from "react";

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

interface ApiTransaction {
  _id?: string;
  id?: string;
  timestamp?: string;
  status?: string;
  amount?: number;
  details?: string;
}

interface TransactionsResponse {
  transactions?: ApiTransaction[];
}

const initialTransactions: Transaction[] = [
  {
    id: "TRX-20260506-001",
    timestamp: "2026-05-06T08:10:22+07:00",
    status: "success",
    amount: 5000,
    details: "QRIS payment accepted - 500 ml",
  },
  {
    id: "TRX-20260506-002",
    timestamp: "2026-05-06T08:17:43+07:00",
    status: "failed",
    amount: 5000,
    details: "Timeout - 500 ml",
  },
  {
    id: "TRX-20260506-003",
    timestamp: "2026-05-06T08:26:11+07:00",
    status: "success",
    amount: 10000,
    details: "QRIS payment accepted - 1000 ml",
  },
  {
    id: "TRX-20260506-004",
    timestamp: "2026-05-06T08:31:09+07:00",
    status: "success",
    amount: 5000,
    details: "Manual retry completed - 500 ml",
  },
  {
    id: "TRX-20260506-005",
    timestamp: "2026-05-06T08:39:56+07:00",
    status: "failed",
    amount: 10000,
    details: "Gateway rejected duplicate transaction - 1000 ml",
  },
  {
    id: "TRX-20260506-006",
    timestamp: "2026-05-06T08:44:20+07:00",
    status: "failed",
    amount: 5000,
    details: "Pump confirmation missed - 500 ml",
  },
  {
    id: "TRX-20260506-007",
    timestamp: "2026-05-06T08:52:04+07:00",
    status: "success",
    amount: 10000,
    details: "QRIS payment accepted - 1000 ml",
  },
  {
    id: "TRX-20260506-008",
    timestamp: "2026-05-06T09:01:38+07:00",
    status: "failed",
    amount: 10000,
    details: "Timeout - 1000 ml",
  },
];

export function useTransactionData(): UseTransactionDataResult {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const response = await fetch("/api/transactions");

        if (!response.ok) {
          throw new Error(`Failed to load transactions: ${response.status}`);
        }

        const data = (await response.json()) as TransactionsResponse;
        const nextTransactions = (data.transactions ?? [])
          .map((transaction): Transaction | null => {
            const status = transaction.status?.toLowerCase();

            if (
              !transaction.timestamp ||
              typeof transaction.amount !== "number" ||
              !transaction.details ||
              (status !== "success" && status !== "failed")
            ) {
              return null;
            }

            return {
              id: transaction.id ?? transaction._id ?? crypto.randomUUID(),
              timestamp: transaction.timestamp,
              status,
              amount: transaction.amount,
              details: transaction.details,
            };
          })
          .filter((transaction): transaction is Transaction => transaction !== null);

        if (isMounted) {
          setTransactions(nextTransactions);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadTransactions();
    const intervalId = window.setInterval(loadTransactions, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

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
