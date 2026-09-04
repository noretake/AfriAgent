import { useMutation } from "@tanstack/react-query";
import { LoadError } from "../components/Panel";
import { useInvalidateFinancial, useSecurity } from "../hooks/useApi";
import { api } from "../services/api";
import { when } from "../utils/format";

export function SecurityPage() {
  const { data, error, isLoading } = useSecurity();
  const invalidate = useInvalidateFinancial();
  const stop = useMutation({ mutationFn: () => api.emergencyStop("Activated from Security page"), onSettled: invalidate });
  const reset = useMutation({ mutationFn: () => api.resetEmergencyStop(), onSettled: invalidate });
  if (isLoading) return <div className="text-slate-400">Loading security status…</div>;
  if (error || !data) return <LoadError error={error} />;

  const rows: [string, string][] = [
    ["AI Agent", data.agent],
    ["Market data", data.marketData],
    ["Balance access", data.balanceAccess],
    ["Trading", data.trading],
    ["Withdrawals", data.withdrawals],
    ["Policy Engine", data.policyEngine],
    ["Human approval", data.humanApproval],
    ["Demo Mode", data.demoMode],
  ];
  const good = (v: string) => ["ACTIVE", "ENABLED"].includes(v);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="text-sm text-slate-400">Read-only access is always kept. Emergency Stop halts every new financial execution.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <dl className="space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-800 pb-2 last:border-0">
                <dt className="text-slate-400">{k}</dt>
                <dd className={good(v) ? "text-emerald-300" : k === "Withdrawals" || k === "Demo Mode" ? "text-slate-300" : "text-rose-300"}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={`card space-y-3 ${data.emergencyStop.active ? "border-rose-800" : ""}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Emergency Stop</h2>
          <p className="text-2xl font-semibold">{data.emergencyStop.active ? <span className="text-rose-300">ACTIVE</span> : <span className="text-emerald-300">Inactive</span>}</p>
          {data.emergencyStop.active && (
            <p className="text-xs text-slate-400">Since {when(data.emergencyStop.activatedAt)} · {data.emergencyStop.reason}</p>
          )}
          {data.emergencyStop.active ? (
            <button className="btn-secondary" disabled={reset.isPending} onClick={() => reset.mutate()}>Reset emergency stop</button>
          ) : (
            <button className="btn-danger" disabled={stop.isPending} onClick={() => stop.mutate()}>Activate emergency stop</button>
          )}
        </div>
      </div>
      <div className="card text-sm text-slate-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Guarantees</h2>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>The AI never bypasses the Policy Engine and never modifies policies.</li>
          <li>Only server-verified approvals reach the exchange layer; the frontend is never trusted for authorization.</li>
          <li>Policy is re-evaluated at execution time — stale approvals cannot execute against a changed policy.</li>
          <li>The agent never asks for private keys, seed phrases, passwords or API secrets.</li>
          <li>Demo Mode executions are labelled DEMO_EXECUTED and never claim real Binance settlement.</li>
        </ul>
      </div>
    </div>
  );
}
