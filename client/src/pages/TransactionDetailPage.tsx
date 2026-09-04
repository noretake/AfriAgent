import { Link, useParams } from "react-router-dom";
import { LoadError, Panel } from "../components/Panel";
import { PolicyChecks } from "../components/PolicyChecks";
import { StatusBadge } from "../components/StatusBadge";
import { useTransaction } from "../hooks/useApi";
import { qty, usd, when } from "../utils/format";

export function TransactionDetailPage() {
  const { id = "" } = useParams();
  const { data, error, isLoading } = useTransaction(id);
  if (isLoading) return <div className="text-slate-400">Loading…</div>;
  if (error || !data) return <LoadError error={error} />;
  const { transaction: t, intent, originalRequest, policy, approval, auditTimeline } = data;
  return (
    <div className="space-y-6">
      <Link to="/transactions" className="text-xs text-brand-400">← Back to transactions</Link>
      <header className="flex items-center gap-3">
        <StatusBadge value={t.action} />
        <h1 className="text-2xl font-semibold">{usd(t.amountUsd)} of {t.asset}</h1>
        <StatusBadge value={t.status} />
        {t.executionLabel && <StatusBadge value={t.executionLabel} />}
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Transaction">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-400">Quantity</dt><dd>{qty(t.amount)} {t.asset}</dd>
            <dt className="text-slate-400">Price</dt><dd>{usd(t.price)}</dd>
            <dt className="text-slate-400">Exchange ref</dt><dd className="font-mono text-xs">{t.externalTransactionId ?? "—"}</dd>
            <dt className="text-slate-400">Created</dt><dd>{when(t.createdAt)}</dd>
            <dt className="text-slate-400">Updated</dt><dd>{when(t.updatedAt)}</dd>
            {t.failureReason && (<><dt className="text-slate-400">Reason</dt><dd className="text-rose-300">{t.failureReason}</dd></>)}
          </dl>
        </Panel>
        <Panel title="Intent">
          {originalRequest && <p className="mb-2 text-sm italic text-slate-300">“{originalRequest}”</p>}
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300">{JSON.stringify(intent?.payload ?? null, null, 2)}</pre>
        </Panel>
        <Panel title="Policy evaluation">{policy ? <PolicyChecks result={policy} /> : <span className="text-sm text-slate-500">No evaluation recorded.</span>}</Panel>
        <Panel title="Approval">
          {approval ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">Status</dt><dd><StatusBadge value={approval.status} /></dd>
              <dt className="text-slate-400">Requested</dt><dd>{when(approval.createdAt)}</dd>
              <dt className="text-slate-400">Decided</dt><dd>{when(approval.approvedAt)}</dd>
              <dt className="text-slate-400">Expires</dt><dd>{when(approval.expiresAt)}</dd>
            </dl>
          ) : <span className="text-sm text-slate-500">No approval was required or created.</span>}
        </Panel>
      </div>
      <Panel title="Audit timeline">
        <ol className="space-y-2 text-sm">
          {auditTimeline.map((l) => (
            <li key={l.id} className="flex gap-3 border-b border-slate-800 pb-2 last:border-0">
              <span className="w-40 shrink-0 text-xs text-slate-400">{when(l.createdAt)}</span>
              <span className="font-mono text-xs">{l.eventType}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
