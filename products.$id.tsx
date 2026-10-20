import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/products/$id")({
  component: () => <Navigate to="/" />,
});
