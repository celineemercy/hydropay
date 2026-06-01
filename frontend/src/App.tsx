import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const navItems = ["Summary", "Recent Transactions", "Analytics"];
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
            <Button
              onClick={() => document.getElementById("recent-transactions")?.scrollIntoView()}
              size="none"
              type="button"
              variant="linkCoral"
            >
              Review Alerts -&gt;
            </Button>
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

          <div className="header-insight" aria-label="Dashboard health summary">
            <div>
              <span className="insight-label">Success rate</span>
              <span className="insight-value">{successRate}%</span>
            </div>
            <div>
              <span className="insight-label">Open reviews</span>
              <span className="insight-value">{metrics.failedCount}</span>
            </div>
          </div>

          <nav aria-label="Dashboard navigation" className="dashboard-nav">
            {navItems.map((item) => (
              <Button
                key={item}
                size="none"
                type="button"
                variant={item === "Summary" ? "segmentActive" : "segment"}
              >
                {item}
              </Button>
            ))}
          </nav>
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

        <section className="transactions-section" id="recent-transactions">
          <Card className="transactions-card">
            <CardHeader className="transactions-header">
              <div className="transactions-titlebar">
                <div>
                  <CardTitle className="transactions-title">Recent Transactions</CardTitle>
                  <CardDescription className="transactions-description">
                    Search, filter, and review the latest dispenser payment events.
                  </CardDescription>
                </div>
                <Badge variant="count">
                  Showing {visibleTransactions.length} of {metrics.totalCount}
                </Badge>
              </div>

              <div className="toolbar-grid">
                <label className="search-field">
                  <Icon name="search" className="dashboard-icon search-field-icon" />
                  <Input
                    className="search-input"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by transaction ID or details..."
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

              <div className="filter-chips">
                {filters.map((filter) => (
                  <Button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    size="none"
                    type="button"
                    variant={statusFilter === filter.value ? "chipActive" : "chip"}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="transactions-content">
              {visibleTransactions.map((transaction) => (
                <article className="transaction-row" key={transaction.id}>
                  <div>
                    <div className="transaction-id">{transaction.id}</div>
                    <div className="transaction-time">{formatTimestamp(transaction.timestamp)}</div>
                  </div>

                  <div className="transaction-status">
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
                  </div>

                  <div className="transaction-detail-group">
                    <div className="transaction-amount">{formatAmount(transaction.amount)}</div>
                    <div className="transaction-detail">{transaction.details}</div>
                  </div>
                </article>
              ))}

              {visibleTransactions.length === 0 ? (
                <div className="transaction-empty">No transactions match the current filters.</div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
