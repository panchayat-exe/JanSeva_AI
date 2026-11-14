import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/pages/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Citizen Profile | Janseva AI" },
      {
        name: "description",
        content:
          "Your verified citizen profile, account information and a summary of all complaints filed on Janseva AI.",
      },
      { property: "og:title", content: "Citizen Profile | Janseva AI" },
      {
        property: "og:description",
        content: "Verified citizen details and complaint summary at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});
