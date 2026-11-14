import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Officer Dashboard | Janseva AI Government Portal" },
      {
        name: "description",
        content:
          "Janseva AI officer dashboard for municipal grievance redressal — track citizen complaints, AI priority and ward-wise resolution status.",
      },
      { property: "og:title", content: "Officer Dashboard | Janseva AI Government Portal" },
      {
        property: "og:description",
        content: "Track citizen complaints, AI priority and ward-wise resolution status.",
      },
    ],
  }),
  component: Dashboard,
});
