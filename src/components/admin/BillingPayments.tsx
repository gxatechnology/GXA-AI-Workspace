import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  ErrorState,
  Loading,
  Select,
  DateInput,
  NumberInput,
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

const paymentDefaults = {
  search: "",
  status: "",
  plan: "",
  billingType: "",
  environment: "",
  verified: "",
  amountFrom: "",
  amountTo: "",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
  page: "1",
  pageSize: "25",
  range: "30d",
};
export default function Payments({ user, navigate }: any) {
  const [filters, setFilters] = useState(paymentDefaults);
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
      window.history.replaceState({}, "", `/admin/payments?${query}`);
      setState(await request(user, `/api/admin/payments?${query}`));
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
        `/api/admin/payments/export.csv?${query}`,
        "gxa-payments.csv",
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
        eyebrow="Payment Administration"
        title="Verified payment records"
        text="Server-filtered PostgreSQL records. Provider signatures and raw payloads are never returned."
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
          aria-label="Search payments"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer, email, user or safe provider reference"
          className={`${input} w-full`}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Select
            label="Status"
            value={filters.status}
            onChange={(v: string) => update("status", v)}
            options={[
              ["", "All"],
              ["captured", "Captured"],
              ["pending", "Pending"],
              ["checkout_created", "Checkout created"],
              ["authorized", "Authorized"],
              ["failed", "Failed"],
              ["verification_failed", "Verification failed"],
              ["webhook_rejected", "Webhook rejected"],
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
            label="Billing type"
            value={filters.billingType}
            onChange={(v: string) => update("billingType", v)}
            options={[
              ["", "All"],
              ["one_time_monthly", "One-time monthly"],
              ["initial_subscription_payment", "Initial subscription"],
              ["recurring_renewal", "Renewal"],
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
            label="Verification"
            value={filters.verified}
            onChange={(v: string) => update("verified", v)}
            options={[
              ["", "All"],
              ["true", "Verified"],
              ["false", "Not verified"],
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DateInput
            label="From"
            value={filters.dateFrom}
            onChange={(v: string) => update("dateFrom", v)}
          />
          <DateInput
            label="To"
            value={filters.dateTo}
            onChange={(v: string) => update("dateTo", v)}
          />
          <NumberInput
            label="Minimum paise"
            value={filters.amountFrom}
            onChange={(v: string) => update("amountFrom", v)}
          />
          <NumberInput
            label="Maximum paise"
            value={filters.amountTo}
            onChange={(v: string) => update("amountTo", v)}
          />
          <Select
            label="Sort"
            value={filters.sort}
            onChange={(v: string) => update("sort", v)}
            options={[
              ["newest", "Newest"],
              ["oldest", "Oldest"],
              ["highest_amount", "Highest amount"],
              ["lowest_amount", "Lowest amount"],
              ["status", "Status"],
              ["plan", "Plan"],
            ]}
          />
        </div>
      </section>
      {error && <ErrorState error={error} retry={load} />}
      {loading && !state ? (
        <Loading text="Loading payments…" />
      ) : (
        state && (
          <section className={card}>
            {state.payments.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1700px] text-left text-xs">
                    <thead>
                      <tr>
                        {[
                          "Payment date",
                          "Customer",
                          "User ID",
                          "Plan",
                          "Billing type",
                          "Amount",
                          "Currency",
                          "Status",
                          "Provider",
                          "Payment reference",
                          "Order reference",
                          "Subscription reference",
                          "Verification",
                          "Captured date",
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
                      {state.payments.map((item: any) => (
                        <tr
                          key={item.id}
                          className="border-t dark:border-zinc-800"
                        >
                          <td className="p-3">
                            {dateTime(item.capturedAt || item.createdAt)}
                          </td>
                          <td className="p-3">
                            <strong>{item.customerName || "Unlinked"}</strong>
                            <span className="block text-[10px] text-slate-500">
                              {item.customerEmail || "No email"}
                            </span>
                          </td>
                          <td className="p-3">{item.userId || "No user"}</td>
                          <td className="p-3">{plan(item.planKey)}</td>
                          <td className="p-3">{label(item.billingType)}</td>
                          <td className="p-3 font-black">
                            {money(item.amountPaise)}
                          </td>
                          <td className="p-3">{item.currency}</td>
                          <td className="p-3">
                            <Status value={item.status} />
                          </td>
                          <td className="p-3">{item.provider}</td>
                          <td className="p-3">
                            {item.providerPaymentReference || "Pending"}
                          </td>
                          <td className="p-3">
                            {item.providerOrderReference || "Not available"}
                          </td>
                          <td className="p-3">
                            {item.providerSubscriptionReference ||
                              "Not applicable"}
                          </td>
                          <td className="p-3">{item.verificationState}</td>
                          <td className="p-3">{dateTime(item.capturedAt)}</td>
                          <td className="p-3">{item.environment}</td>
                          <td className="p-3">
                            <button
                              onClick={() =>
                                navigate(
                                  `/admin/payments/${encodeURIComponent(item.id)}`,
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
                  noun="payments"
                />
              </>
            ) : (
              <Empty text="No payment records match these filters. Revenue remains ₹0 when no verified captures exist." />
            )}
          </section>
        )
      )}
    </div>
  );
}
