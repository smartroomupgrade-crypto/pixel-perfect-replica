import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Room" },
      { name: "description", content: "Sign in to control your smart room remotely." },
      { property: "og:title", content: "Sign in — Smart Room" },
      { property: "og:description", content: "Sign in to control your smart room remotely." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  if (!loading && user) return <Navigate to="/controls" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "up") toast.success("Check your email to confirm your account.");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String((r.error as Error).message ?? r.error));
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="card-surface w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Power className="size-5" /></div>
          <div>
            <h1 className="text-xl font-bold">Smart Room</h1>
            <p className="text-xs text-muted-foreground">Remote Access</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>Continue with Google</Button>
        <button className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
