import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardOfficer } from "@/pages/DashboardOfficer";

export const Route = createFileRoute("/dashboard/officer")({
  head: () => ({
    meta: [
      { title: "Officer Dashboard | JanSeva AI" },
      { name: "description", content: "Officer dashboard — view and manage your assigned grievances." },
    ],
  }),
  beforeLoad: () => {
    if (typeof document !== "undefined") {
      const userRaw = localStorage.getItem("janseva_user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      // Only OFFICER, DEPT_ADMIN, SUPER_ADMIN can access officer view
      if (!user || user.role === "CITIZEN") {
        throw redirect({ to: "/" });
      }
    }
  },
  component: DashboardOfficer,
});
