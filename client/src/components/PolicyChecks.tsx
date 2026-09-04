import { CheckCircle2, XCircle } from "lucide-react";
import type { PolicyResult } from "../../../shared/types";

export function PolicyChecks({ result }: { result: PolicyResult }) {
  return (
    <div className="space-y-2">
      <div className={`text-sm font-semibold ${result.allowed ? "text-emerald-300" : "text-rose-300"}`}>
        {result.allowed ? (result.requiresApproval ? "Allowed — approval required" : "Allowed") : "Blocked by policy"}
        <span className="ml-2 text-xs font-normal text-slate-400">policy v{result.policyVersion}</span>
      </div>
      <ul className="space-y-1">
        {result.checks.map((c) => (
          <li key={c.name} className="flex items-start gap-2 text-xs">
            {c.passed ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />}
            <span>
              <span className="font-medium text-slate-200">{c.name}:</span> <span className="text-slate-400">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
