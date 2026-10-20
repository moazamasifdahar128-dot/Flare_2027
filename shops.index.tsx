import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shops/")({
  component: () => <Navigate to="/" />,
});
