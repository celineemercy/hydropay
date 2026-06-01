import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  type Transaction,
  type TransactionStatus,
  useTransactionData,
} from "@/hooks/useTransactionData";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

type IconName =
  | "activity"
  | "alert"
  | "check"
  | "chevron"
  | "close"
  | "filter"
  | "pulse"
  | "search"
  | "trend"
  | "water";
type StatusFilter = "all" | TransactionStatus;

const filters: Array<{ label: string; value: StatusFilter }> = [
  { label: "All Status", value: "all" },
  { label: "Success Only", value: "success" },
  { label: "Failed Only", value: "failed" },
];

function formatTimestamp(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatTime(value: string): string {
  return timeFormatter.format(new Date(value));
}

function formatAmount(value: number): string {
  return currencyFormatter.format(value).replace(/\s/g, " ");
}

function formatVolume(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} L`;
  }

  return `${value.toLocaleString("id-ID")} ml`;
}

function extractVolume(details: string): number {
  const match = details.match(/(\d+)\s*ml/i);
  return match ? Number(match[1]) : 0;
}

function getFailureReason(details: string): string {
  const normalized = details.toLowerCase();

  if (normalized.includes("timeout") || normalized.includes("expired")) return "Payment timeout";
  if (normalized.includes("gateway") || normalized.includes("rejected")) return "Payment rejected";
  if (normalized.includes("pump")) return "Pump confirmation";
  if (normalized.includes("duplicate")) return "Duplicate payment";
  return "Needs review";
}

function Icon({ name, className }: { name: IconName; className?: string }): JSX.Element {
  const paths: Record<IconName, JSX.Element> = {
    activity: (
      <>
        <path d="M4 19V5" />
        <path d="M8 19v-7" />
        <path d="M12 19V8" />
        <path d="M16 19v-4" />
        <path d="M20 19V9" />
      </>
    ),
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 4.3 2.7 17.5A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.5L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </>
    ),
    trend: (
      <>
        <path d="M4 17h16" />
        <path d="m5 13 4-4 4 3 6-7" />
      </>
    ),
    water: (
      <>
        <path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" />
        <path d="M9 15a3 3 0 0 0 3 3" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  helper: string;
  tone: "teal" | "blue" | "rose" | "amber";
}): JSX.Element {
  return (
    <Card className={cn("kpi-card", `kpi-${tone}`)}>
      <CardContent className="kpi-content">
        <div className="kpi-topline">
          <span className="kpi-icon">
            <Icon name={icon} className="dashboard-icon" />
          </span>
          <span className="kpi-label">{label}</span>
        </div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-helper">{helper}</div>
      </CardContent>
    </Card>
  );
}

export default function App(): JSX.Element {
  const { transactions, metrics } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const managerMetrics = useMemo(() => {
    const successfulTransactions = transactions.filter((transaction) => transaction.status === "success");
    const failedTransactions = transactions.filter((transaction) => transaction.status === "failed");
    const revenue = successfulTransactions.reduce((total, transaction) => total + transaction.amount, 0);
    const totalVolume = successfulTransactions.reduce(
      (total, transaction) => total + extractVolume(transaction.details),
      0,
    );
    const successRate =
      metrics.totalCount === 0 ? 0 : Math.round((metrics.successCount / metrics.totalCount) * 100);
    const failureRate =
      metrics.totalCount === 0 ? 0 : Math.round((metrics.failedCount / metrics.totalCount) * 100);
    const averageTransaction =
      successfulTransactions.length === 0 ? 0 : Math.round(revenue / successfulTransactions.length);
    const latestTransaction = transactions[0];

    return {
      averageTransaction,
      failedTransactions,
      failureRate,
      latestTransaction,
      revenue,
      successRate,
      successfulTransactions,
      totalVolume,
    };
  }, [metrics.failedCount, metrics.successCount, metrics.totalCount, transactions]);

  const failureBreakdown = useMemo(() => {
    const reasons = managerMetrics.failedTransactions.reduce<Record<string, number>>(
      (summary, transaction) => {
        const reason = getFailureReason(transaction.details);
        summary[reason] = (summary[reason] ?? 0) + 1;
        return summary;
      },
      {},
    );

    return Object.entries(reasons)
      .map(([label, count]) => ({ count, label }))
      .sort((left, right) => right.count - left.count);
  }, [managerMetrics.failedTransactions]);

  const hourlyTrend = useMemo(() => {
    const buckets = transactions.reduce<Record<string, { count: number; revenue: number }>>(
      (summary, transaction) => {
        const hour = new Date(transaction.timestamp).getHours().toString().padStart(2, "0");
        const bucket = summary[hour] ?? { count: 0, revenue: 0 };
        bucket.count += 1;
        if (transaction.status === "success") {
          bucket.revenue += transaction.amount;
        }
        summary[hour] = bucket;
        return summary;
      },
      {},
    );
    const maxCount = Math.max(1, ...Object.values(buckets).map((bucket) => bucket.count));

    return Object.entries(buckets)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([hour, bucket]) => ({
        ...bucket,
        hour: `${hour}:00`,
        percent: Math.max(8, Math.round((bucket.count / maxCount) * 100)),
      }));
  }, [transactions]);

  const alerts = useMemo(() => {
    const nextAlerts: string[] = [];

    if (managerMetrics.failureRate >= 30) {
      nextAlerts.push(`${managerMetrics.failureRate}% failed payments need review.`);
    }

    if (failureBreakdown[0]) {
      nextAlerts.push(`Top issue: ${failureBreakdown[0].label}.`);
    }

    if (transactions.length === 0) {
      nextAlerts.push("No dispenser activity has been recorded.");
    }

    return nextAlerts.length > 0 ? nextAlerts : ["No urgent action required right now."];
  }, [failureBreakdown, managerMetrics.failureRate, transactions.length]);

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        transaction.id.toLowerCase().includes(normalizedQuery) ||
        transaction.details.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter, transactions]);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">HydroPay Smart Dispenser</p>
            <div className="dashboard-title-row">
              <h1 className="dashboard-title">Manager Dashboard</h1>
              <Badge variant="live">
                <span className="dot dot-live" />
                Live
              </Badge>
            </div>
            <p className="dashboard-subtitle">
              Revenue, dispenser activity, payment health, and issues that need action.
            </p>
          </div>
        </header>

        <section className="kpi-grid" aria-label="Business summary">
          <KpiCard
            helper={`Avg. ${formatAmount(managerMetrics.averageTransaction)} per successful payment`}
            icon="trend"
            label="Revenue Today"
            tone="teal"
            value={formatAmount(managerMetrics.revenue)}
          />
          <KpiCard
            helper={`${managerMetrics.successRate}% success rate`}
            icon="check"
            label="Successful Payments"
            tone="blue"
            value={`${metrics.successCount} / ${metrics.totalCount}`}
          />
          <KpiCard
            helper={`${managerMetrics.failureRate}% need review`}
            icon="alert"
            label="Failed Payments"
            tone="rose"
            value={`${metrics.failedCount} / ${metrics.totalCount}`}
          />
          <KpiCard
            helper="Successful refill volume"
            icon="water"
            label="Volume Dispensed"
            tone="amber"
            value={formatVolume(managerMetrics.totalVolume)}
          />
        </section>

        <section className="operations-grid" aria-label="Operational monitoring">
          <Card className="panel-card machine-card">
            <CardContent className="panel-content">
              <div className="panel-heading">
                <span className="panel-icon">
                  <Icon name="pulse" className="dashboard-icon" />
                </span>
                <div>
                  <h2 className="panel-title">Machine Status</h2>
                  <p className="panel-description">Current operational view for the dispenser.</p>
                </div>
              </div>

              <div className="machine-status-row">
                <span className="machine-status-dot" />
                <div>
                  <div className="machine-status-title">Monitoring active</div>
                  <div className="machine-status-detail">
                    Last event{" "}
                    {managerMetrics.latestTransaction
                      ? formatTimestamp(managerMetrics.latestTransaction.timestamp)
                      : "not available"}
                  </div>
                </div>
              </div>

              <div className="machine-stats">
                <div>
                  <span>Total events</span>
                  <strong>{metrics.totalCount}</strong>
                </div>
                <div>
                  <span>Last amount</span>
                  <strong>
                    {managerMetrics.latestTransaction
                      ? formatAmount(managerMetrics.latestTransaction.amount)
                      : formatAmount(0)}
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-card alerts-card">
            <CardContent className="panel-content">
              <div className="panel-heading">
                <span className="panel-icon panel-icon-alert">
                  <Icon name="alert" className="dashboard-icon" />
                </span>
                <div>
                  <h2 className="panel-title">Action Needed</h2>
                  <p className="panel-description">Issues a manager should check first.</p>
                </div>
              </div>

              <div className="alert-list">
                {alerts.map((alert) => (
                  <div className="alert-item" key={alert}>
                    {alert}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="panel-card">
            <CardContent className="panel-content">
              <div className="panel-heading">
                <span className="panel-icon">
                  <Icon name="close" className="dashboard-icon" />
                </span>
                <div>
                  <h2 className="panel-title">Failure Breakdown</h2>
                  <p className="panel-description">Why dispenser payments are failing.</p>
                </div>
              </div>

              <div className="breakdown-list">
                {failureBreakdown.length > 0 ? (
                  failureBreakdown.map((item) => (
                    <div className="breakdown-row" key={item.label}>
                      <div>
                        <span>{item.label}</span>
                        <small>{item.count} event{item.count === 1 ? "" : "s"}</small>
                      </div>
                      <Progress
                        className="breakdown-progress"
                        indicatorClassName="breakdown-progress-fill"
                        value={Math.round((item.count / Math.max(1, metrics.failedCount)) * 100)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="empty-panel">No failed payments recorded.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="panel-card">
            <CardContent className="panel-content">
              <div className="panel-heading">
                <span className="panel-icon">
                  <Icon name="activity" className="dashboard-icon" />
                </span>
                <div>
                  <h2 className="panel-title">Hourly Activity</h2>
                  <p className="panel-description">Transactions grouped by usage hour.</p>
                </div>
              </div>

              <div className="trend-bars">
                {hourlyTrend.length > 0 ? (
                  hourlyTrend.map((item) => (
                    <div className="trend-row" key={item.hour}>
                      <span>{item.hour}</span>
                      <div className="trend-track">
                        <span style={{ width: `${item.percent}%` }} />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-panel">No hourly activity available.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="records-section" id="transaction-data">
          <Card className="records-card">
            <CardContent className="records-content">
              <div className="records-header">
                <div>
                  <h2 className="records-title">Transaction Data</h2>
                  <p className="records-description">
                    Latest payment and dispenser records from the connected backend.
                  </p>
                </div>
                <Badge variant="count">
                  Showing {visibleTransactions.length} of {metrics.totalCount}
                </Badge>
              </div>

              <div className="records-toolbar">
                <label className="search-field">
                  <Icon name="search" className="dashboard-icon search-field-icon" />
                  <Input
                    className="search-input"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search transaction ID or details..."
                    type="search"
                    value={searchQuery}
                  />
                </label>

                <div className="filter-menu">
                  <Button
                    aria-expanded={isFilterOpen}
                    className="filter-trigger"
                    onClick={() => setIsFilterOpen((value) => !value)}
                    size="none"
                    type="button"
                    variant="ghost"
                  >
                    <span className="filter-label">
                      <Icon name="filter" className="dashboard-icon" />
                      {filters.find((filter) => filter.value === statusFilter)?.label}
                    </span>
                    <Icon name="chevron" className="dashboard-icon-sm" />
                  </Button>

                  {isFilterOpen ? (
                    <div className="filter-popover">
                      {filters.map((filter) => (
                        <Button
                          key={filter.value}
                          onClick={() => {
                            setStatusFilter(filter.value);
                            setIsFilterOpen(false);
                          }}
                          size="none"
                          type="button"
                          variant={statusFilter === filter.value ? "filterActive" : "filter"}
                        >
                          {filter.label}
                          {statusFilter === filter.value ? (
                            <span className="filter-active-dot" />
                          ) : null}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="records-list">
                {visibleTransactions.map((transaction: Transaction) => (
                  <article className="record-row" key={transaction.id}>
                    <div>
                      <div className="record-id">{transaction.id}</div>
                      <div className="record-time">
                        {formatTimestamp(transaction.timestamp)} at {formatTime(transaction.timestamp)}
                      </div>
                    </div>

                    <Badge
                      variant={transaction.status === "success" ? "statusSuccess" : "statusFailed"}
                    >
                      <span
                        className={cn(
                          "dot",
                          transaction.status === "success" ? "dot-success" : "dot-failed",
                        )}
                      />
                      {transaction.status === "success" ? "Success" : "Failed"}
                    </Badge>

                    <div className="record-detail-group">
                      <div className="record-amount">{formatAmount(transaction.amount)}</div>
                      <div className="record-detail">{transaction.details}</div>
                    </div>
                  </article>
                ))}

                {visibleTransactions.length === 0 ? (
                  <div className="record-empty">No transaction data matches the current filters.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
