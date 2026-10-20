import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/products/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    shop: typeof search.shop === "string" ? search.shop : "",
  }),
  component: () => <Navigate to="/" />,
});
