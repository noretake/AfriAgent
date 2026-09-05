import { LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { signOut } from "../hooks/useAuth";
import { ApiError } from "../services/api";

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-slate-500">{text}</div>;
}

export function LoadError({ error }: { error: unknown }) {
  const unauthorized = error instanceof ApiError && error.status === 401;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">
      <span>{error instanceof Error ? error.message : "Failed to load"}</span>
      {unauthorized && (
        <button type="button" className="btn-primary gap-1 px-3 py-1" onClick={() => void signOut()}>
          <LogIn className="h-4 w-4" /> Sign in
        </button>
      )}
    </div>
  );
}
