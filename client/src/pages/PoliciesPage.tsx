import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { PolicyUpdate } from "../../../shared/types";
import { LoadError } from "../components/Panel";
import { keys, usePolicies } from "../hooks/useApi";
import { api, ApiError } from "../services/api";
import { when } from "../utils/format";

export function PoliciesPage() {
  const { data, error, isLoading } = usePolicies();
  const qc = useQueryClient();
  const [form, setForm] = useState<PolicyUpdate | null>(null);
  const [assets, setAssets] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        maxTransactionUsd: data.maxTransactionUsd,
        dailyLimitUsd: data.dailyLimitUsd,
        maxPortfolioExposure: data.maxPortfolioExposure,
        allowedAssets: data.allowedAssets,
        requireApproval: data.requireApproval,
        riskTolerance: data.riskTolerance,
      });
      setAssets(data.allowedAssets.join(", "));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (update: PolicyUpdate) => api.updatePolicies(update),
    onSuccess: (policy) => {
      qc.setQueryData(keys.policies, policy);
      void qc.invalidateQueries({ queryKey: keys.audit });
      setMsg({ ok: true, text: `Policy saved (v${policy.version}).` });
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Failed to save policy" }),
  });

  if (isLoading || !form) return <div className="text-slate-400">Loading policies…</div>;
  if (error || !data) return <LoadError error={error} />;

  const num = (k: keyof PolicyUpdate) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Policies</h1>
        <p className="text-sm text-slate-400">Deterministic limits enforced server-side on every trade. Policy v{data.version} · updated {when(data.updatedAt)}</p>
      </header>
      <form
        className="card grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          save.mutate({ ...form, allowedAssets: assets.split(",").map((a) => a.trim().toUpperCase()).filter(Boolean) });
        }}
      >
        <div>
          <label className="label">Max transaction (USD)</label>
          <input className="input" type="number" min={1} step="0.01" value={form.maxTransactionUsd} onChange={num("maxTransactionUsd")} />
        </div>
        <div>
          <label className="label">Daily limit (USD)</label>
          <input className="input" type="number" min={1} step="0.01" value={form.dailyLimitUsd} onChange={num("dailyLimitUsd")} />
        </div>
        <div>
          <label className="label">Max portfolio exposure per trade (%)</label>
          <input className="input" type="number" min={1} max={100} value={form.maxPortfolioExposure} onChange={num("maxPortfolioExposure")} />
        </div>
        <div>
          <label className="label">Allowed assets (comma-separated)</label>
          <input className="input" value={assets} onChange={(e) => setAssets(e.target.value)} />
        </div>
        <div>
          <label className="label">Risk tolerance</label>
          <select className="input" value={form.riskTolerance} onChange={(e) => setForm({ ...form, riskTolerance: e.target.value as PolicyUpdate["riskTolerance"] })}>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={form.requireApproval} onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })} />
          Require human approval before execution
        </label>
        <div className="flex items-center gap-3 md:col-span-2">
          <button type="submit" className="btn-primary" disabled={save.isPending}>Save policy</button>
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</span>}
        </div>
      </form>
      <p className="text-xs text-slate-500">The AI agent can read policies but can never modify them. Changes take effect immediately and are audited.</p>
    </div>
  );
}
