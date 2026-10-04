import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Room Remote Access" },
      { name: "description", content: "Remotely control and monitor your Arduino smart room." },
      { property: "og:title", content: "Smart Room Remote Access" },
      { property: "og:description", content: "Remotely control and monitor your Arduino smart room." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  return <Navigate to={user ? "/controls" : "/auth"} />;
}
