import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  component: () => <Navigate to="/" />,
});
