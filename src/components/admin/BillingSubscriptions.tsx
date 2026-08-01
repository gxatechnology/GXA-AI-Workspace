import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  ErrorState,
  Loading,
  Select,
  DateInput,
  Pagination,
  Status,
  Empty,
  ListHeader,
  button,
  card,
  dateTime,
  exportCsv,
  input,
  label,
  money,
  plan,
  reportingQuery,
  request,
} from "./billingAdminShared";

const subscriptionDefaults = {
  search: "",
  status: "",
  plan: "",
  environment: "",
  billingMode: "",
  cancelled: "",
  periodEndFrom: "",
  periodEndTo: "",
  attention: "",
  sort: "recently_updated",
  page: "1",
  pageSize: "25",
  range: "30d",
};
export default function Subscriptions({ user, navigate }: any) {
  const [filters, setFilters] = useState(subscriptionDefaults);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(
      () => setFilters((current) => ({ ...current, search, page: "1" })),
      350,
    );
    return () => clearTimeout(id);
  }, [search]);
  const query = useMemo(() => reportingQuery(filters), [filters]);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      window.history.replaceState({}, "", `/admin/subscriptions?${query}`);
      setState(await request(user, `/api/admin/subscriptions?${query}`));
    } catch (cause: any) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [query.toString()]);
  const update = (key: string, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "page" ? {} : { page: "1" }),
    }));
  const download = async () => {
    setExporting(true);
    setError("");
    try {
      await exportCsv(
        user,
        `/api/admin/subscriptions/export.csv?${query}`,
        "gxa-subscriptions.csv",
      );
    } catch (cause: any) {
      setError(cause.message);
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-5">
      <ListHeader
        eyebrow="Subscription Administration"
        title="Subscription lifecycle"
        text="Read-only provider-synchronized status and paid-period health."
        onRefresh={load}
        extra={
          user.role === "super_admin" && (
            <button
              onClick={download}
              disabled={exporting}
              className={`${button} border dark:border-zinc-700`}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          )
        }
      />
      <section className={`${card} space-y-3`}>
        <input
          aria-label="Search subscriptions"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer, email, user or provider reference"
          className={`${input} w-full`}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Select
            label="Status"
            value={filters.status}
            onChange={(v: string) => update("status", v)}
            options={[
              ["", "All"],
              ...[
                "created",
                "authenticated",
                "active",
                "pending",
                "halted",
                "paused",
                "cancelled",
                "completed",
                "expired",
              ].map((v) => [v, label(v)]),
            ]}
          />
          <Select
            label="Plan"
            value={filters.plan}
            onChange={(v: string) => update("plan", v)}
            options={[
              ["", "All"],
              ["starter", "Starter"],
              ["pro", "Pro"],
              ["business-pro", "Business Pro"],
            ]}
          />
          <Select
            label="Environment"
            value={filters.environment}
            onChange={(v: string) => update("environment", v)}
            options={[
              ["", "Configured"],
              ["test", "Test"],
              ["live", "Live"],
              ["unknown", "Unknown"],
            ]}
          />
          <Select
            label="Billing mode"
            value={filters.billingMode}
            onChange={(v: string) => update("billingMode", v)}
            options={[
              ["", "All"],
              ["recurring_subscription", "Recurring"],
              ["one_time_monthly", "One-time monthly"],
            ]}
          />
          <Select
            label="Needs attention"
            value={filters.attention}
            onChange={(v: string) => update("attention", v)}
            options={[
              ["", "All"],
              ["true", "Attention"],
              ["false", "Healthy"],
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DateInput
            label="Period end from"
            value={filters.periodEndFrom}
            onChange={(v: string) => update("periodEndFrom", v)}
          />
          <DateInput
            label="Period end to"
            value={filters.periodEndTo}
            onChange={(v: string) => update("periodEndTo", v)}
          />
          <Select
            label="Cancellation"
            value={filters.cancelled}
            onChange={(v: string) => update("cancelled", v)}
            options={[
              ["", "All"],
              ["true", "Scheduled/cancelled"],
              ["false", "Not cancelled"],
            ]}
          />
          <Select
            label="Sort"
            value={filters.sort}
            onChange={(v: string) => update("sort", v)}
            options={[
              ["recently_updated", "Recently updated"],
              ["newest", "Newest"],
              ["oldest", "Oldest"],
              ["period_end", "Period end"],
              ["status", "Status"],
              ["plan", "Plan"],
            ]}
          />
        </div>
      </section>
      {error && <ErrorState error={error} retry={load} />}{" "}
      {loading && !state ? (
        <Loading text="Loading subscriptions…" />
      ) : (
        state && (
          <section className={card}>
            {state.subscriptions.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1350px] text-left text-xs">
                    <thead>
                      <tr>
                        {[
                          "Customer",
                          "Plan",
                          "Status",
                          "Billing mode",
                          "Amount",
                          "Current period",
                          "Next charge",
                          "Cancellation",
                          "Latest payment",
                          "Latest failure",
                          "Environment",
                          "Action",
                        ].map((item) => (
                          <th key={item} className="p-3">
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.subscriptions.map((item: any) => (
                        <tr
                          key={item.id}
                          className="border-t dark:border-zinc-800"
                        >
                          <td className="p-3">
                            <strong>{item.customerName || "Unlinked"}</strong>
                            <span className="block text-[10px] text-slate-500">
                              {item.customerEmail || item.userId || "No user"}
                            </span>
                          </td>
                          <td className="p-3">{plan(item.planKey)}</td>
                          <td className="p-3">
                            <Status value={item.status} />
                          </td>
                          <td className="p-3">{label(item.billingMode)}</td>
                          <td className="p-3 font-black">
                            {money(item.amountPaise)}
                          </td>
                          <td className="p-3">
                            {dateTime(item.currentPeriodStart)}
                            <span className="block text-[10px] text-slate-500">
                              to {dateTime(item.currentPeriodEnd)}
                            </span>
                          </td>
                          <td className="p-3">{dateTime(item.nextChargeAt)}</td>
                          <td className="p-3">
                            {item.cancelAtPeriodEnd
                              ? "At period end"
                              : item.cancelledAt
                                ? "Cancelled"
                                : "No"}
                          </td>
                          <td className="p-3">
                            {dateTime(item.latestPaymentAt)}
                          </td>
                          <td className="p-3">
                            {item.verificationError || "None recorded"}
                          </td>
                          <td className="p-3">{item.environment}</td>
                          <td className="p-3">
                            <button
                              onClick={() =>
                                navigate(
                                  `/admin/subscriptions/${encodeURIComponent(item.id)}`,
                                )
                              }
                              className="font-black text-teal-700 dark:text-teal-300"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  data={state.pagination}
                  update={update}
                  noun="subscriptions"
                />
              </>
            ) : (
              <Empty text="No subscriptions match these filters." />
            )}
          </section>
        )
      )}
    </div>
  );
}
