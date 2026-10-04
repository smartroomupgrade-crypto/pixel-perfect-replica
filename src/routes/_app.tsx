import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ProjectProvider, useProject } from "@/lib/project";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  return (
    <ProjectProvider>
      <EnsureProject />
    </ProjectProvider>
  );
}

function EnsureProject() {
  const { user } = useAuth();
  const { loading, project, reload } = useProject();
  const creating = useRef(false);
  useEffect(() => {
    if (loading || project || !user || creating.current) return;
    creating.current = true;
    supabase.from("projects").insert({ user_id: user.id, name: "My Smart Room", demo_mode: true }).then(() => reload());
  }, [loading, project, user, reload]);
  if (loading || !project) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Preparing your room…</div>;
  return <AppShell><Outlet /></AppShell>;
}
