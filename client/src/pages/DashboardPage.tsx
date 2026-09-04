import { Link } from "react-router-dom";
import { ApprovalCard } from "../components/ApprovalCard";
import { Empty, LoadError, Panel } from "../components/Panel";
import { useDashboard } from "../hooks/useApi";
import { pct, qty, usd, when } from "../utils/format";

export function DashboardPage() {
  const { data, error, isLoading } = useDashboard();
  if (isLoading) return <div className="text-slate-400">Loading dashboard…</div>;
  if (error || !data) return <LoadError error={error} />;

  const { portfolio, agentStatus, today, recentActivity, pendingApprovals } = data;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-400">Live data from the AfriAgent backend · updated {when(portfolio.updatedAt)}</p>
        </div>
        <Link to="/copilot" className="btn-primary">Open AI Copilot</Link>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <div className="label">Portfolio value</div>
          <div className="text-2xl font-semibold">{usd(portfolio.totalValueUsd)}</div>
        </div>
        <div className="card">
          <div className="label">Today's volume</div>
          <div className="text-2xl font-semibold">{usd(today.volumeUsd)}</div>
          <div className="text-xs text-slate-400">{today.transactions} transaction(s)</div>
        </div>
        <div className="card">
          <div className="label">Blocked today</div>
          <div className="text-2xl font-semibold">{today.blocked}</div>
        </div>
        <div className="card">
          <div className="label">Pending approvals</div>
          <div className="text-2xl font-semibold">{today.pending}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Portfolio">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr><th className="pb-2">Asset</th><th>Balance</th><th>Price</th><th>Value</th><th>Allocation</th></tr>
              </thead>
              <tbody>
                {portfolio.positions.map((p) => (
                  <tr key={p.asset} className="border-t border-slate-800">
                    <td className="py-2 font-medium">{p.asset}</td>
                    <td>{qty(p.balance)}</td>
                    <td>{usd(p.price)}</td>
                    <td>{usd(p.valueUsd)}</td>
                    <td>{pct(p.allocationPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
        <Panel title="Agent status">
          <dl className="space-y-2 text-sm">
            {[
              ["AI Agent", agentStatus.aiAgent],
              ["Policy Engine", agentStatus.policyEngine],
              ["Exchange", agentStatus.exchange === "DEMO" ? "Mock Binance (DEMO)" : "Binance (LIVE)"],
              ["Security", agentStatus.security],
              ["AI provider", agentStatus.aiProvider],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-800 pb-2 last:border-0">
                <dt className="text-slate-400">{k}</dt>
                <dd className={v === "EMERGENCY_STOP" ? "font-medium text-rose-300" : "font-medium"}>{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="Pending approvals" action={<Link to="/approvals" className="text-xs text-brand-400">View all</Link>}>
        {pendingApprovals.length === 0 ? <Empty text="No approvals waiting." /> : (
          <div className="space-y-3">{pendingApprovals.map((a) => <ApprovalCard key={a.id} approval={a} />)}</div>
        )}
      </Panel>

      <Panel title="Recent activity" action={<Link to="/audit" className="text-xs text-brand-400">Full audit log</Link>}>
        {recentActivity.length === 0 ? <Empty text="No activity yet. Ask the copilot something." /> : (
          <ul className="space-y-1 text-sm">
            {recentActivity.map((l) => (
              <li key={l.id} className="flex justify-between border-b border-slate-800 py-1 last:border-0">
                <span className="font-mono text-xs">{l.eventType}</span>
                <span className="text-xs text-slate-400">{when(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
