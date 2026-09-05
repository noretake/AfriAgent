import { Activity, Github } from "lucide-react";
import { useState } from "react";
import { supabase } from "../services/supabase";

const redirectTo = () => window.location.origin;

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}

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
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
        if (error) setError(error.message);
        else if (!data.session) setNotice("Check your inbox to confirm your email, then sign in.");
      }
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) setError(error.message);
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
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          or continue with
          <div className="h-px flex-1 bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary justify-center gap-2" onClick={() => void oauth("google")}>
            <GoogleIcon /> Google
          </button>
          <button type="button" className="btn-secondary justify-center gap-2" onClick={() => void oauth("github")}>
            <Github className="h-4 w-4" /> GitHub
          </button>
        </div>
        <button type="button" className="w-full text-center text-xs text-slate-400 hover:text-white" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
