import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shops/$id")({
  component: () => <Navigate to="/" />,
});
