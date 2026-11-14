import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "@/pages/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Officer Profile | Janseva AI Government Portal" },
      {
        name: "description",
        content:
          "View and update your municipal officer profile, posting details and account password on the Janseva AI portal.",
      },
      { property: "og:title", content: "Officer Profile | Janseva AI" },
      {
        property: "og:description",
        content: "Municipal officer account details, posting information and password settings.",
      },
    ],
  }),
  component: Profile,
});