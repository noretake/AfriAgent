import { Activity } from "lucide-react";
import { useState } from "react";
import { supabase } from "../services/supabase";

export function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else if (!data.session) setNotice("Check your inbox to confirm your email, then sign in.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-5">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand-400" />
          <div>
            <div className="text-lg font-semibold">AfriAgent</div>
            <div className="text-[11px] text-slate-400">AI that acts. You stay in control.</div>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          {mode === "signin" ? "Sign in to view your portfolio and approve trades." : "Create an account. Your policies and approvals are private to you."}
        </p>
        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          <input className="input w-full" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input w-full"
            type="password"
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">{error}</div>}
          {notice && <div className="rounded-lg border border-brand-900 bg-brand-950/40 px-3 py-2 text-xs text-brand-100">{notice}</div>}
          <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button type="button" className="w-full text-center text-xs text-slate-400 hover:text-white" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
