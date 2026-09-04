const colors: Record<string, string> = {
  EXECUTED: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  DEMO_EXECUTED: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  LIVE_EXECUTED: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  APPROVED: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  PENDING: "bg-amber-900/60 text-amber-200 border-amber-800",
  EXECUTING: "bg-sky-900/60 text-sky-200 border-sky-800",
  BLOCKED: "bg-rose-900/60 text-rose-200 border-rose-800",
  REJECTED: "bg-slate-800 text-slate-300 border-slate-700",
  FAILED: "bg-rose-900/60 text-rose-200 border-rose-800",
  EXPIRED: "bg-slate-800 text-slate-300 border-slate-700",
  BUY: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  SELL: "bg-rose-900/60 text-rose-200 border-rose-800",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${colors[value] ?? "bg-slate-800 text-slate-300 border-slate-700"}`}>
      {value}
    </span>
  );
}
