import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/follow/$username")({
  component: () => <Navigate to="/" />,
});
