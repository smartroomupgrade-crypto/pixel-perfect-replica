import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { user: User | null; session: Session | null; loading: boolean; isAnonymous: boolean };
const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, isAnonymous: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session);
        setLoading(false);
      } else {
        // No login wall: create an anonymous session so the app works immediately.
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (!error) setSession(anon.session);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const user = session?.user ?? null;
  const isAnonymous = !!user && (user.is_anonymous === true || !user.email);
  return <Ctx.Provider value={{ session, user, loading, isAnonymous }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
