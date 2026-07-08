import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/player")({
  component: () => <Outlet />,
});
