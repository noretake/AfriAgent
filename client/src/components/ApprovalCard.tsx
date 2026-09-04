import { useState } from "react";
import type { Approval } from "../../../shared/types";
import { ApiError } from "../services/api";
import { useApprovalActions } from "../hooks/useApi";
import { usd, qty, when } from "../utils/format";
import { StatusBadge } from "./StatusBadge";

export function ApprovalCard({ approval: initial, onDone }: { approval: Approval; onDone?: (message: string, ok: boolean) => void }) {
  const { approve, reject } = useApprovalActions();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Approval | null>(null);
  const approval = resolved && resolved.id === initial.id ? resolved : initial;
  const busy = approve.isPending || reject.isPending;
  const expired = new Date(approval.expiresAt).getTime() < Date.now();

  const handle = async (fn: () => Promise<{ message: string; approval: Approval }>) => {
    setError(null);
    try {
      const out = await fn();
      setResolved(out.approval);
      onDone?.(out.message, true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Request failed";
      setError(msg);
      onDone?.(msg, false);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge value={approval.summary.action} />
          <span className="text-lg font-semibold">
            {usd(approval.summary.amountUsd)} of {approval.summary.asset}
          </span>
        </div>
        <StatusBadge value={expired && approval.status === "PENDING" ? "EXPIRED" : approval.status} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
        <div>
          <dt>Est. quantity</dt>
          <dd className="text-slate-200">{qty(approval.summary.estimatedAmount)} {approval.summary.asset}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd className="text-slate-200">{usd(approval.summary.price)}</dd>
        </div>
        <div>
          <dt>Requested</dt>
          <dd className="text-slate-200">{when(approval.createdAt)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd className="text-slate-200">{when(approval.expiresAt)}</dd>
        </div>
      </dl>
      {approval.status === "PENDING" && !expired && (
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => handle(() => approve.mutateAsync(approval.id))}>
            Approve & execute
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => handle(() => reject.mutateAsync({ id: approval.id, reason: "Rejected by user" }))}>
            Reject
          </button>
        </div>
      )}
      {error && <div className="text-xs text-rose-300">{error}</div>}
    </div>
  );
}
