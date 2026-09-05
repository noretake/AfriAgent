import type { Session } from "@supabase/supabase-js";
import { Activity, Bot, ClipboardCheck, LayoutDashboard, ListOrdered, LogOut, ScrollText, Shield, ShieldAlert } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useHealth, useSecurity } from "../hooks/useApi";
import { signOut } from "../hooks/useAuth";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/copilot", label: "AI Copilot", icon: Bot },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/policies", label: "Policies", icon: Shield },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
  { to: "/security", label: "Security", icon: ShieldAlert },
];

export function Layout({ session }: { session: Session | null }) {
  const health = useHealth();
  const security = useSecurity();
  const stopped = security.data?.emergencyStop.active ?? false;
  const needsSignIn = health.data?.auth === "supabase" && !session;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Activity className="h-6 w-6 text-brand-400" />
          <div>
            <div className="text-lg font-semibold">AfriAgent</div>
            <div className="text-[11px] text-slate-400">AI that acts. You stay in control.</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-1 rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>API</span>
            <span className={health.isError ? "text-rose-400" : health.data ? "text-brand-400" : ""}>
              {health.isError ? "offline" : health.data ? "online" : "…"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mode</span>
            <span className="uppercase">{health.data?.mode ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Storage</span>
            <span>{health.data?.storage ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Exchange</span>
            <span>{health.data?.exchange ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>AI</span>
            <span>{health.data?.aiProvider ?? "—"}</span>
          </div>
        </div>
        {session && (
          <div className="mt-3 flex items-center justify-between gap-2 px-1 text-xs text-slate-400">
            <span className="truncate" title={session.user.email}>{session.user.email}</span>
            <button type="button" className="flex items-center gap-1 hover:text-white" onClick={() => void signOut()}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-6 py-2 text-xs">
          <div className="flex items-center gap-2 md:hidden">
            <Activity className="h-4 w-4 text-brand-400" />
            <span className="font-semibold">AfriAgent</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {session ? (
              <>
                <span className="hidden truncate text-slate-400 sm:inline">{session.user.email}</span>
                <button type="button" className="btn-secondary gap-1 px-2 py-1" onClick={() => void signOut()}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </>
            ) : (
              <span className={needsSignIn ? "text-rose-300" : "text-slate-400"}>{needsSignIn ? "Not signed in" : "Demo user"}</span>
            )}
          </div>
        </div>
        {health.data?.mode === "demo" && (
          <div className="border-b border-amber-900/50 bg-amber-950/40 px-6 py-2 text-xs text-amber-200">
            Demo Mode — simulated Binance exchange. No real funds move. Executions are labelled DEMO_EXECUTED.
          </div>
        )}
        {needsSignIn && (
          <div className="border-b border-rose-900/60 bg-rose-950/50 px-6 py-2 text-xs text-rose-200">
            The API requires sign-in but this frontend has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY configured.
          </div>
        )}
        {stopped && (
          <div className="border-b border-rose-900/60 bg-rose-950/50 px-6 py-2 text-xs font-medium text-rose-200">
            EMERGENCY STOP ACTIVE — all trading execution is halted. Read-only access remains available.
          </div>
        )}
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
