import { useState } from "react";
import { Empty, LoadError } from "../components/Panel";
import { useAudit } from "../hooks/useApi";
import { when } from "../utils/format";

export function AuditPage() {
  const { data, error, isLoading } = useAudit();
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <div className="text-slate-400">Loading audit log…</div>;
  if (error || !data) return <LoadError error={error} />;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-slate-400">Immutable record of every agent message, intent, policy decision, approval and execution.</p>
      </header>
      <div className="card p-0">
        {data.logs.length === 0 ? <Empty text="No audit events yet." /> : (
          <ul>
            {data.logs.map((l) => (
              <li key={l.id} className="border-b border-slate-800 last:border-0">
                <button className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-800/50" onClick={() => setOpen(open === l.id ? null : l.id)}>
                  <span className="font-mono text-xs">{l.eventType}</span>
                  <span className="text-xs text-slate-400">{when(l.createdAt)}</span>
                </button>
                {open === l.id && <pre className="overflow-x-auto bg-slate-950 px-4 py-3 text-xs text-slate-300">{JSON.stringify(l.metadata, null, 2)}</pre>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
