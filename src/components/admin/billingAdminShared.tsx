import React from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { authHeaders } from "../../utils/auth";

export const card =
  "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
export const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
export const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-40";
export const money = (paise: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);
export const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "Not available";
export const plan = (key: string) =>
  ({ pro: "Starter", pro_plus: "Pro", "business-pro": "Business Pro" })[key] ||
  key ||
  "Unknown";
export const label = (value: unknown) =>
  String(value || "unknown").replaceAll("_", " ");

export function reportingQuery(filters: any) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(
    ([key, value]) => value && query.set(key, String(value)),
  );
  return query;
}

export async function request(user: any, path: string) {
  const response = await fetch(path, {
    headers: authHeaders(user),
    credentials: "same-origin",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "Billing analytics could not be loaded.");
  return body;
}
export async function exportCsv(user: any, path: string, fallback: string) {
  const response = await fetch(path, {
    headers: authHeaders(user),
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "CSV export failed.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download =
    response.headers
      .get("Content-Disposition")
      ?.match(/filename="([^"]+)"/)?.[1] || fallback;
  link.click();
  URL.revokeObjectURL(url);
}

export function ListHeader({ eyebrow, title, text, onRefresh, extra }: any) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
      </div>
      <div className="flex gap-2">
        {extra}
        <button
          onClick={onRefresh}
          className={`${button} border dark:border-zinc-700`}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </header>
  );
}
export function Select({ label: heading, value, onChange, options }: any) {
  return (
    <label className="block min-w-36 text-[10px] font-black uppercase tracking-wide text-slate-500">
      <span className="mb-1 block">{heading}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${input} w-full normal-case tracking-normal`}
      >
        {options.map(([key, name]: string[]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function DateInput({ label: heading, value, onChange }: any) {
  return (
    <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
      <span className="mb-1 block">{heading}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={input}
      />
    </label>
  );
}
export function NumberInput({ label: heading, value, onChange }: any) {
  return (
    <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
      <span className="mb-1 block">{heading}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={input}
      />
    </label>
  );
}
export function Pagination({ data, update, noun }: any) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs dark:border-zinc-800">
      <span>
        {data.total.toLocaleString("en-IN")} {noun} · page {data.page} of{" "}
        {data.totalPages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={data.page <= 1}
          onClick={() => update("page", String(data.page - 1))}
          className={`${button} border dark:border-zinc-700`}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          disabled={data.page >= data.totalPages}
          onClick={() => update("page", String(data.page + 1))}
          className={`${button} border dark:border-zinc-700`}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
export function Status({ value }: any) {
  const warning = [
    "failed",
    "verification_failed",
    "webhook_rejected",
    "halted",
    "expired",
  ].includes(value);
  const good = ["captured", "active"].includes(value);
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${good ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : warning ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"}`}
    >
      {label(value)}
    </span>
  );
}
export function Banner({ tone, title, text }: any) {
  const colors =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
      : tone === "green"
        ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
        : "border-slate-300 bg-slate-100 text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";
  return (
    <aside className={`rounded-2xl border p-4 ${colors}`}>
      <strong className="text-sm">{title}</strong>
      <p className="mt-1 text-xs">{text}</p>
    </aside>
  );
}
export function ErrorState({ error, retry }: any) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
    >
      <AlertTriangle className="mb-2 h-5 w-5" />
      <strong>Billing analytics could not be loaded.</strong>
      <p className="mt-1">{error}</p>
      <button
        onClick={retry}
        className={`${button} mt-3 bg-rose-600 text-white`}
      >
        Retry
      </button>
    </div>
  );
}
export function Loading({ text }: any) {
  return (
    <div
      role="status"
      className={`${card} flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500`}
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      {text}
    </div>
  );
}
export function Empty({ text }: any) {
  return (
    <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500 dark:border-zinc-700">
      {text}
    </p>
  );
}
