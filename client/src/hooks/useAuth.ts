import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export interface AuthState {
  /** False while the persisted session is being restored. */
  ready: boolean;
  session: Session | null;
  configured: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { ready, session, configured: supabase !== null };
}

/** Email for email/OAuth users; shortened wallet address for Web3 users. */
export function displayName(user: User): string {
  if (user.email) return user.email;
  const claims = user.user_metadata as { custom_claims?: { address?: string } } | undefined;
  const address = claims?.custom_claims?.address;
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Wallet user";
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
