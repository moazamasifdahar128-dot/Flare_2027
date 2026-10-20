import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cart")({
  component: () => <Navigate to="/" />,
});
