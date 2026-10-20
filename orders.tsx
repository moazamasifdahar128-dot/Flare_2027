import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orders")({
  component: () => <Navigate to="/" />,
});
