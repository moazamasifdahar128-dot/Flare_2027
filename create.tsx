import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/create")({ component: CreateMenu });

function CreateMenu() {
  return <Navigate to="/gigs/new" search={{ edit: "" }} />;
}
