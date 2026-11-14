import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/Settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Janseva AI" },
      {
        name: "description",
        content:
          "Manage your language, notification preferences, privacy policies and support options on Janseva AI.",
      },
      { property: "og:title", content: "Settings | Janseva AI" },
      {
        property: "og:description",
        content: "Language, notifications, privacy and support preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});
