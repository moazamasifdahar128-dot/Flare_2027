import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/news")({
  component: () => <Navigate to="/" />,
});
