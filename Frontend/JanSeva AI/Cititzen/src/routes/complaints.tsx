import { createFileRoute } from "@tanstack/react-router";
import { ComplaintsPage } from "@/pages/Complaints";

export const Route = createFileRoute("/complaints")({
  head: () => ({
    meta: [
      { title: "My Complaints | Janseva AI" },
      {
        name: "description",
        content: "View and track all your civic complaints and their resolution progress in one place.",
      },
      { property: "og:title", content: "My Complaints | Janseva AI" },
      {
        property: "og:description",
        content: "Track the status and progress of every complaint you have filed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsPage,
});
