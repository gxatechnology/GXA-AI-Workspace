import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, RefreshCw, Repeat2, ShieldCheck } from "lucide-react";
import {
  Banner,
  ErrorState,
  Loading,
  Select,
  DateInput,
  button,
  card,
  dateTime,
  label,
  money,
  plan,
  reportingQuery,
  request,
} from "./billingAdminShared";

const reportingDefaults = { range: "30d", from: "", to: "", environment: "" };
function ReportingControls({ filters, setFilters }: any) {
  const update = (key: string, value: string) =>
    setFilters((current: any) => ({ ...current, [key]: value }));
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Reporting period"
        value={filters.range}
        onChange={(value: string) => update("range", value)}
        options={[
          ["today", "Today"],
          ["yesterday", "Yesterday"],
          ["7d", "Last 7 days"],
          ["30d", "Last 30 days"],
          ["90d", "Last 90 days"],
          ["current_month", "Current month"],
          ["previous_month", "Previous month"],
          ["custom", "Custom"],
        ]}
      />
      <Select
        label="Environment"
        value={filters.environment}
        onChange={(value: string) => update("environment", value)}
        options={[
          ["", "Configured mode"],
          ["test", "Test"],
          ["live", "Live"],
          ["unknown", "Unconfigured/unknown"],
        ]}
      />
      {filters.range === "custom" && (
        <>
          <DateInput
            label="From"
            value={filters.from}
            onChange={(value: string) => update("from", value)}
          />
          <DateInput
            label="To"
            value={filters.to}
            onChange={(value: string) => update("to", value)}
          />
        </>
      )}
    </div>
  );
}
export default function BillingOverview({ user, navigate }: any) {
  const [filters, setFilters] = useState(reportingDefaults);
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const query = useMemo(() => reportingQuery(filters), [filters]);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      window.history.replaceState({}, "", `/admin/billing?${query}`);
      const [summary, trend, distribution, health] = await Promise.all([
        request(user, `/api/admin/billing/summary?${query}`),
        request(user, `/api/admin/billing/revenue-trend?${query}`),
        request(user, `/api/admin/billing/plan-distribution?${query}`),
        request(user, `/api/admin/billing/health?${query}`),
      ]);
      setState({ summary, trend, distribution, health });
    } catch (cause: any) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [query.toString()]);
  if (loading && !state)
    return <Loading text="Loading verified billing analytics…" />;
  const reporting = state?.summary?.reporting;
  const metrics = state?.summary?.metrics || {};
  const indicators = state?.health?.indicators || {};
  const warnings = Object.entries(indicators).filter(
    ([, count]) => Number(count) > 0,
  );
  const kpis = [
    ["Total verified revenue", money(metrics.totalRevenuePaise)],
    ["Revenue today", money(metrics.revenueTodayPaise)],
    ["Revenue this week", money(metrics.revenueThisWeekPaise)],
    ["Revenue this month", money(metrics.revenueThisMonthPaise)],
    ["Previous month", money(metrics.previousMonthRevenuePaise)],
    [
      "Month-over-month",
      metrics.monthOverMonthPercent === null
        ? "Not available"
        : `${metrics.monthOverMonthPercent}%`,
    ],
    ["Current MRR", money(metrics.mrrPaise)],
    ["Estimated ARR", money(metrics.estimatedArrPaise)],
    ["Average payment", money(metrics.averageSuccessfulPaymentPaise)],
    ["Successful payments", metrics.successfulPayments || 0],
    ["Failed payments", metrics.failedPayments || 0],
    ["Pending payments", metrics.pendingPayments || 0],
    ["Active paid subscriptions", metrics.activePaidSubscriptions || 0],
    ["Pending subscriptions", metrics.pendingSubscriptions || 0],
    ["Halted subscriptions", metrics.haltedSubscriptions || 0],
    ["Paused subscriptions", metrics.pausedSubscriptions || 0],
    ["Cancelled subscriptions", metrics.cancelledSubscriptions || 0],
    ["Expired subscriptions", metrics.expiredSubscriptions || 0],
    ["Renewals needing attention", metrics.renewalFailures || 0],
  ];
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">
            Billing Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            Verified revenue and billing health
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Server-calculated from unique captured PostgreSQL payment records.
            Refund tracking is not configured.
          </p>
          {state?.summary?.generatedAt && (
            <p className="mt-1 text-xs text-slate-500">
              Last updated {dateTime(state.summary.generatedAt)}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={`${button} border dark:border-zinc-700`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>
      <ReportingControls filters={filters} setFilters={setFilters} />
      {reporting?.environment === "test" ? (
        <Banner
          tone="amber"
          title="Test Mode — No real money collected"
          text="Test and live billing records are reported separately."
        />
      ) : reporting?.environment === "live" ? (
        <Banner
          tone="green"
          title="Live billing environment"
          text="Only verified live-mode transactions are included."
        />
      ) : (
        <Banner
          tone="slate"
          title="Payment mode is not configured"
          text="Only records explicitly marked unknown are shown. Test and live revenue are not combined."
        />
      )}
      {error && <ErrorState error={error} retry={load} />}
      {state && (
        <>
          <section
            aria-label="Revenue metrics"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {kpis.map(([name, value]) => (
              <article key={String(name)} className={card}>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  {name}
                </p>
                <p className="mt-2 text-xl font-black">{String(value)}</p>
              </article>
            ))}
          </section>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.5fr)]">
            <section className={card}>
              <h2 className="font-black">Revenue trend</h2>
              <p className="text-xs text-slate-500">
                Captured INR revenue, with zero-value dates retained.
              </p>
              <RevenueChart points={state.trend.points || []} />
            </section>
            <section className={card}>
              <h2 className="font-black">Plan revenue</h2>
              <div className="mt-4 space-y-4">
                {state.distribution.plans.map((item: any) => (
                  <div key={item.planKey}>
                    <div className="flex justify-between gap-3 text-xs">
                      <strong>{item.planName}</strong>
                      <span>
                        {money(item.revenuePaise)} · {item.revenuePercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-zinc-800">
                      <span
                        className="block h-2 rounded-full bg-teal-600"
                        style={{
                          width: `${Math.min(100, item.revenuePercent)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {item.successfulPayments} payments ·{" "}
                      {item.activeSubscribers} active · {item.renewalFailures}{" "}
                      renewal failures
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">Billing health</h2>
                <p className="text-xs text-slate-500">
                  No record is changed by viewing this report.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-teal-600" />
            </div>
            {warnings.length ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {warnings.map(([name, count]) => (
                  <li
                    key={name}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                  >
                    <strong>{label(name)}</strong>
                    <span className="mt-1 block text-lg font-black">
                      {Number(count)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                No billing-health issue is present in this environment.
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Reconciliation is intentionally CLI-only. Last run:{" "}
              {state.summary.latestReconciliation
                ? `${state.summary.latestReconciliation.status} · ${dateTime(state.summary.latestReconciliation.completedAt)}`
                : "No reconciliation receipt is available."}
            </p>
          </section>
          <section className="grid gap-5 xl:grid-cols-2">
            <RecentPayments
              title="Recent successful payments"
              records={(state.summary.recentPayments || []).filter(
                (item: any) => item.status === "captured",
              )}
              navigate={navigate}
            />
            <RecentPayments
              title="Recent failed or pending payments"
              records={(state.summary.recentPayments || []).filter(
                (item: any) => item.status !== "captured",
              )}
              navigate={navigate}
            />
          </section>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/admin/payments")}
              className={`${button} bg-teal-600 text-white`}
            >
              <CreditCard className="h-4 w-4" />
              View payments
            </button>
            <button
              onClick={() => navigate("/admin/subscriptions")}
              className={`${button} border dark:border-zinc-700`}
            >
              <Repeat2 className="h-4 w-4" />
              View subscriptions
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RevenueChart({ points }: any) {
  const maximum = Math.max(
    1,
    ...points.map((item: any) => Number(item.revenuePaise || 0)),
  );
  const width = 720;
  const path = points
    .map(
      (item: any, index: number) =>
        `${index ? "L" : "M"} ${points.length === 1 ? width / 2 : index * (width / Math.max(1, points.length - 1))} ${170 - (Number(item.revenuePaise || 0) / maximum) * 150}`,
    )
    .join(" ");
  return (
    <div>
      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox="0 0 720 190"
          role="img"
          aria-label="Verified revenue trend"
          className="min-w-[620px]"
        >
          <path
            d={path || "M 0 170 L 720 170"}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-teal-600"
          />
          {points.map((item: any, index: number) => (
            <circle
              key={item.date}
              cx={
                points.length === 1
                  ? width / 2
                  : index * (width / Math.max(1, points.length - 1))
              }
              cy={170 - (Number(item.revenuePaise || 0) / maximum) * 150}
              r="3"
              className="fill-teal-600"
            >
              <title>
                {item.date}: {money(item.revenuePaise)},{" "}
                {item.successfulPayments} payments
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <details>
        <summary className="cursor-pointer text-xs font-black text-teal-700 dark:text-teal-300">
          View accessible data table
        </summary>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-left text-xs">
            <thead>
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Revenue</th>
                <th className="p-2">Payments</th>
                <th className="p-2">New subscriptions</th>
                <th className="p-2">Renewals</th>
              </tr>
            </thead>
            <tbody>
              {points.map((item: any) => (
                <tr key={item.date}>
                  <td className="p-2">{item.date}</td>
                  <td className="p-2">{money(item.revenuePaise)}</td>
                  <td className="p-2">{item.successfulPayments}</td>
                  <td className="p-2">{item.newPaidSubscriptions}</td>
                  <td className="p-2">{item.successfulRenewals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
function RecentPayments({ title, records, navigate }: any) {
  return (
    <section className={card}>
      <h2 className="font-black">{title}</h2>
      {records.length ? (
        <ul className="mt-4 space-y-2">
          {records.slice(0, 5).map((item: any) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border p-3 text-xs dark:border-zinc-700"
            >
              <span>
                <strong>
                  {item.customerName ||
                    item.customerEmail ||
                    "Unlinked customer"}
                </strong>
                <span className="block text-[10px] text-slate-500">
                  {plan(item.planKey)} ·{" "}
                  {dateTime(item.capturedAt || item.createdAt)}
                </span>
              </span>
              <button
                onClick={() =>
                  navigate(`/admin/payments/${encodeURIComponent(item.id)}`)
                }
                className="font-black text-teal-700 dark:text-teal-300"
              >
                {money(item.amountPaise)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-xs text-slate-500 dark:border-zinc-700">
          No matching payment records.
        </p>
      )}
    </section>
  );
}
