import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/founder/controls")({
  component: ControlsLayout,
});

function ControlsLayout() {
  return <Outlet />;
}
