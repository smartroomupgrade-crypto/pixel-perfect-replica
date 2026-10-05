import { createFileRoute, Navigate } from "@tanstack/react-router";

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
  return <Navigate to="/controls" />;
}
