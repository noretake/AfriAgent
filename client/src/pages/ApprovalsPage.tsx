import { ApprovalCard } from "../components/ApprovalCard";
import { Empty, LoadError } from "../components/Panel";
import { useApprovals } from "../hooks/useApi";

export function ApprovalsPage() {
  const { data, error, isLoading } = useApprovals();
  if (isLoading) return <div className="text-slate-400">Loading approvals…</div>;
  if (error || !data) return <LoadError error={error} />;
  const pending = data.approvals.filter((a) => a.status === "PENDING");
  const past = data.approvals.filter((a) => a.status !== "PENDING");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-sm text-slate-400">Approving re-runs the Policy Engine server-side before anything reaches the exchange.</p>
      </header>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Pending ({pending.length})</h2>
        {pending.length === 0 ? <Empty text="Nothing to approve." /> : pending.map((a) => <ApprovalCard key={a.id} approval={a} />)}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">History ({past.length})</h2>
        {past.length === 0 ? <Empty text="No past approvals." /> : past.map((a) => <ApprovalCard key={a.id} approval={a} />)}
      </section>
    </div>
  );
}
