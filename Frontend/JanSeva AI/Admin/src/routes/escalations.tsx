import { createFileRoute } from "@tanstack/react-router";
import { Escalations } from "@/pages/Escalations";

export const Route = createFileRoute("/escalations")({
  head: () => ({
    meta: [
      { title: "Escalations | JanSeva AI" },
      { name: "description", content: "High-priority unresolved grievances requiring immediate attention." },
    ],
  }),
  component: Escalations,
});
