import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Transaction, useTransactionData } from "@/hooks/useTransactionData";

const dateFormatter = new Intl.DateTimeFormat("en-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatTimestamp(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatAmount(value: number): string {
  return currencyFormatter.format(value);
}

function statusLabel(status: Transaction["status"]): string {
  return status === "success" ? "Success" : "Failed";
}

export default function App(): JSX.Element {
  const { transactions, metrics } = useTransactionData();
  const successRate =
    metrics.totalCount === 0 ? 0 : Math.round((metrics.successCount / metrics.totalCount) * 100);
  const failedRate =
    metrics.totalCount === 0 ? 0 : Math.round((metrics.failedCount / metrics.totalCount) * 100);

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-sm font-medium text-primary">HydroPay Smart Dispenser</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Transaction Monitor
            </h1>
          </div>
          <nav aria-label="Dashboard navigation" className="flex items-center gap-2 text-sm">
            <a
              className="rounded-md px-3 py-2 font-medium text-slate-700 transition hover:bg-accent hover:text-accent-foreground"
              href="#summary"
            >
              Summary
            </a>
            <a
              className="rounded-md px-3 py-2 font-medium text-slate-700 transition hover:bg-accent hover:text-accent-foreground"
              href="#recent-transactions"
            >
              Recent Transactions
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <section id="summary" className="grid gap-4 md:grid-cols-2">
          <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80">
            <CardHeader className="pb-3">
              <CardDescription>Successful Transactions</CardDescription>
              <CardTitle className="text-4xl font-bold text-emerald-700">
                {metrics.successCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-emerald-700">
                <span>{successRate}% of recorded transactions</span>
                <span className="font-medium">Live-ready</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-emerald-100">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50/80">
            <CardHeader className="pb-3">
              <CardDescription>Failed Transactions</CardDescription>
              <CardTitle className="text-4xl font-bold text-rose-700">
                {metrics.failedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-rose-700">
                <span>{failedRate}% need review</span>
                <span className="font-medium">Alert source</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-rose-100">
                <div className="h-2 rounded-full bg-rose-500" style={{ width: `${failedRate}%` }} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="recent-transactions">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Latest payment and dispenser statuses from the dashboard data source.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{metrics.totalCount} records</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Transaction ID</th>
                      <th className="px-6 py-3 font-semibold">Timestamp</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Amount / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-950">
                          {transaction.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                          {formatTimestamp(transaction.timestamp)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={transaction.status === "success" ? "success" : "failed"}
                          >
                            {statusLabel(transaction.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {formatAmount(transaction.amount)}
                          </div>
                          <div className="mt-1 text-slate-500">{transaction.details}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
