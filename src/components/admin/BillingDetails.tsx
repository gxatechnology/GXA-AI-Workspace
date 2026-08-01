import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  ErrorState,
  Loading,
  Status,
  Empty,
  button,
  card,
  dateTime,
  label,
  money,
  plan,
  request,
} from "./billingAdminShared";

export function PaymentDetail({ user, id, navigate }: any) {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState("");
  const load = async () => {
    setError("");
    try {
      setState(
        await request(user, `/api/admin/payments/${encodeURIComponent(id)}`),
      );
    } catch (cause: any) {
      setError(cause.message);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);
  if (error && !state) return <ErrorState error={error} retry={load} />;
  if (!state) return <Loading text="Loading payment details…" />;
  const item = state.payment;
  const rows = [
    ["Internal payment ID", item.id],
    ["Customer", item.customerName || "Unlinked"],
    ["Email", item.customerEmail || "Not available"],
    ["User ID", item.userId || "Not linked"],
    ["Workspace", item.workspaceId || "Not linked"],
    ["Plan", plan(item.planKey)],
    ["Billing type", label(item.billingType)],
    ["Amount", money(item.amountPaise)],
    ["Currency", item.currency],
    ["Status", item.status],
    ["Verification", item.verificationState],
    [
      "Signature verification",
      item.signatureVerified ? "Verified" : "Not verified",
    ],
    ["Provider payment", item.providerPaymentReference || "Not available"],
    ["Provider order", item.providerOrderReference || "Not available"],
    [
      "Provider subscription",
      item.providerSubscriptionReference || "Not available",
    ],
    ["Captured", dateTime(item.capturedAt)],
    ["Created", dateTime(item.createdAt)],
    [
      "Access period",
      `${dateTime(item.accessPeriodStart)} — ${dateTime(item.accessPeriodEnd)}`,
    ],
    ["Environment", item.environment],
    ["Reconciliation", item.reconciliationStatus],
  ];
  return (
    <DetailPage
      back={() => navigate("/admin/payments")}
      backLabel="Back to payments"
      eyebrow="Payment Detail"
      title={`${money(item.amountPaise)} · ${plan(item.planKey)}`}
      rows={rows}
      events={state.lifecycleEvents}
    />
  );
}
export function SubscriptionDetail({ user, id, navigate }: any) {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState("");
  const load = async () => {
    setError("");
    try {
      setState(
        await request(
          user,
          `/api/admin/subscriptions/${encodeURIComponent(id)}`,
        ),
      );
    } catch (cause: any) {
      setError(cause.message);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);
  if (error && !state) return <ErrorState error={error} retry={load} />;
  if (!state) return <Loading text="Loading subscription details…" />;
  const item = state.subscription;
  const rows = [
    ["Internal subscription ID", item.id],
    ["Customer", item.customerName || "Unlinked"],
    ["Email", item.customerEmail || "Not available"],
    ["User ID", item.userId || "Not linked"],
    ["Workspace", item.workspaceId || "Not linked"],
    ["Effective plan", plan(item.currentEffectivePlan || item.planKey)],
    ["Status", item.status],
    ["Billing mode", label(item.billingMode)],
    ["Amount", money(item.amountPaise)],
    ["Currency", item.currency],
    ["Interval", item.billingInterval],
    [
      "Provider subscription",
      item.providerSubscriptionReference || "Not available",
    ],
    ["Provider plan", item.providerPlanReference || "Not available"],
    [
      "Current period",
      `${dateTime(item.currentPeriodStart)} — ${dateTime(item.currentPeriodEnd)}`,
    ],
    ["Next charge", dateTime(item.nextChargeAt)],
    [
      "Cancellation",
      item.cancelAtPeriodEnd
        ? "Scheduled at period end"
        : item.cancelledAt
          ? "Cancelled"
          : "Not scheduled",
    ],
    ["Latest payment", item.latestPaymentReference || "Not available"],
    ["Latest failure", item.verificationError || "None recorded"],
    ["Environment", item.environment],
    [
      "Reconciliation",
      `${item.reconciliationStatus} · ${dateTime(item.lastReconciledAt)}`,
    ],
  ];
  return (
    <DetailPage
      back={() => navigate("/admin/subscriptions")}
      backLabel="Back to subscriptions"
      eyebrow="Subscription Detail"
      title={`${plan(item.planKey)} · ${label(item.status)}`}
      rows={rows}
      events={state.lifecycleEvents}
      payments={state.renewalHistory}
    />
  );
}
function DetailPage({
  back,
  backLabel,
  eyebrow,
  title,
  rows,
  events,
  payments,
}: any) {
  return (
    <div className="space-y-5">
      <button
        onClick={back}
        className={`${button} px-0 text-teal-700 dark:text-teal-300`}
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
      <header>
        <p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Safe provider references only. No signatures, card data or raw webhook
          payloads.
        </p>
      </header>
      <section className={card}>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(([name, value]: any) => (
            <div key={name}>
              <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                {name}
              </dt>
              <dd className="mt-1 break-words text-sm font-bold">
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {payments && (
        <section className={card}>
          <h2 className="font-black">Renewal history</h2>
          {payments.length ? (
            <ul className="mt-4 space-y-2">
              {payments.map((item: any) => (
                <li
                  key={item.id}
                  className="rounded-xl border p-3 text-xs dark:border-zinc-700"
                >
                  {money(item.amountPaise)} · {item.status} ·{" "}
                  {dateTime(item.capturedAt || item.createdAt)}
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No captured renewal is recorded." />
          )}
        </section>
      )}
      <section className={card}>
        <h2 className="font-black">Sanitized lifecycle events</h2>
        {events.length ? (
          <ul className="mt-4 space-y-2">
            {events.map((event: any, index: number) => (
              <li
                key={`${event.eventType}-${event.createdAt}-${index}`}
                className="rounded-xl border p-3 text-xs dark:border-zinc-700"
              >
                <strong>{event.eventType}</strong>
                <span className="ml-2 text-slate-500">
                  {event.processingStatus} ·{" "}
                  {dateTime(event.processedAt || event.createdAt)}
                </span>
                {event.processingError && (
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    {event.processingError}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No lifecycle event is recorded." />
        )}
      </section>
    </div>
  );
}
