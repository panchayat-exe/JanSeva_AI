import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Janseva AI" },
      {
        name: "description",
        content:
          "Report civic complaints by voice, text or photo and track resolution with Janseva AI, a citizen grievance redressal portal.",
      },
      { property: "og:title", content: "Dashboard | Janseva AI" },
      {
        property: "og:description",
        content: "Report civic complaints by voice, text or photo and track resolution with Janseva AI, a citizen grievance redressal portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
