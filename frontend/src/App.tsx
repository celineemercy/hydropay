import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { type TransactionStatus, useTransactionData } from "@/hooks/useTransactionData";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

type IconName = "check" | "close" | "trend" | "pulse" | "search" | "filter" | "chevron";
type StatusFilter = "all" | TransactionStatus;

const filters: Array<{ label: string; value: StatusFilter }> = [
  { label: "All Status", value: "all" },
  { label: "Success Only", value: "success" },
  { label: "Failed Only", value: "failed" },
];

function formatTimestamp(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatAmount(value: number): string {
  return currencyFormatter.format(value).replace(/\s/g, " ");
}

function Icon({ name, className }: { name: IconName; className?: string }): JSX.Element {
  const paths: Record<IconName, JSX.Element> = {
    check: <path d="m5 12 4 4L19 6" />,
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    trend: (
      <>
        <path d="M4 17h16" />
        <path d="m5 13 4-4 4 3 6-7" />
      </>
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
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

function StatCard({
  tone,
  title,
  count,
  total,
  percentage,
  description,
}: {
  tone: "success" | "failed";
  title: string;
  count: number;
  total: number;
  percentage: number;
  description: string;
}): JSX.Element {
  const isSuccess = tone === "success";

  return (
    <Card className={cn("metric-card", isSuccess ? "metric-card-success" : "metric-card-failed")}>
      <CardContent className="metric-content">
        <div className="metric-topline">
          <div className="metric-label">
            <span
              className={cn(
                "metric-icon-badge",
                isSuccess ? "metric-icon-success" : "metric-icon-failed",
              )}
            >
              <Icon name={isSuccess ? "check" : "close"} className="dashboard-icon" />
            </span>
            <span>{title}</span>
          </div>
          {isSuccess ? (
            <Badge variant="active">
              <Icon name="trend" className="dashboard-icon-xs" />
              Active
            </Badge>
          ) : null}
        </div>

        <div className={cn("metric-value", !isSuccess && "metric-value-failed")}>
          <span>{count}</span>
          <span className="metric-divider">/</span>
          <span className="metric-total">{total}</span>
        </div>

        <div className="metric-subline">
          <span>{description}</span>
          <span className={isSuccess ? "metric-percent-success" : "metric-percent-failed"}>
            {percentage}%
          </span>
        </div>

        <Progress
          className="metric-progress"
          indicatorClassName={isSuccess ? "metric-progress-success" : "metric-progress-failed"}
          value={percentage}
        />

        <div className="metric-footer">
          {isSuccess ? (
            <span className="metric-live">
              <Icon name="pulse" className="dashboard-icon-sm" />
              Dispenser Active
            </span>
          ) : (
            <span className="metric-review">Needs operator review</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function App(): JSX.Element {
  const { transactions, metrics } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const successRate =
    metrics.totalCount === 0 ? 0 : Math.round((metrics.successCount / metrics.totalCount) * 100);
  const failedRate =
    metrics.totalCount === 0 ? 0 : Math.round((metrics.failedCount / metrics.totalCount) * 100);

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
              <h1 className="dashboard-title">Transaction Monitor</h1>
              <Badge variant="live">
                <span className="dot dot-live" />
                Live
              </Badge>
            </div>
          </div>
        </header>

        <section className="summary-grid" id="summary">
          <StatCard
            count={metrics.successCount}
            description={`${successRate}% of recorded transactions`}
            percentage={successRate}
            title="Successful Transactions"
            tone="success"
            total={metrics.totalCount}
          />
          <StatCard
            count={metrics.failedCount}
            description={`${failedRate}% need review`}
            percentage={failedRate}
            title="Failed Transactions"
            tone="failed"
            total={metrics.totalCount}
          />
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
                {visibleTransactions.map((transaction) => (
                  <article className="record-row" key={transaction.id}>
                    <div>
                      <div className="record-id">{transaction.id}</div>
                      <div className="record-time">{formatTimestamp(transaction.timestamp)}</div>
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
