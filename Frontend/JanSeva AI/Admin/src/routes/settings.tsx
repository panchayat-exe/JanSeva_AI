import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/pages/Settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Janseva AI Government Portal" },
      {
        name: "description",
        content:
          "Manage notification preferences, portal language, privacy controls and account access for Janseva AI.",
      },
      { property: "og:title", content: "Settings | Janseva AI" },
      {
        property: "og:description",
        content: "Notification, language, privacy and account settings for the officer portal.",
      },
    ],
  }),
  component: Settings,
});