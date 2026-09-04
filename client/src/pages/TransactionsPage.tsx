import { Link } from "react-router-dom";
import { Empty, LoadError } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { useTransactions } from "../hooks/useApi";
import { qty, shortId, usd, when } from "../utils/format";

export function TransactionsPage() {
  const { data, error, isLoading } = useTransactions();
  if (isLoading) return <div className="text-slate-400">Loading transactions…</div>;
  if (error || !data) return <LoadError error={error} />;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-sm text-slate-400">Every proposed trade — executed, pending, blocked, rejected or failed.</p>
      </header>
      <div className="card overflow-x-auto p-0">
        {data.transactions.length === 0 ? <Empty text="No transactions yet." /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="p-3">Time</th><th>Action</th><th>Asset</th><th>USD</th><th>Quantity</th><th>Status</th><th>Execution</th><th>Ref</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className="border-t border-slate-800">
                  <td className="p-3 text-xs text-slate-400">{when(t.createdAt)}</td>
                  <td><StatusBadge value={t.action} /></td>
                  <td className="font-medium">{t.asset}</td>
                  <td>{usd(t.amountUsd)}</td>
                  <td>{qty(t.amount)}</td>
                  <td><StatusBadge value={t.status} /></td>
                  <td className="text-xs">{t.executionLabel ?? "—"}</td>
                  <td className="font-mono text-xs text-slate-400">{t.externalTransactionId ?? shortId(t.id)}</td>
                  <td className="p-3 text-right"><Link className="text-xs text-brand-400" to={`/transactions/${t.id}`}>Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
