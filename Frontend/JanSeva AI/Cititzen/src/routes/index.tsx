import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/Login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Login | Janseva AI" },
      {
        name: "description",
        content:
          "Login to Janseva AI, the citizen grievance redressal portal.",
      },
      { property: "og:title", content: "Login | Janseva AI" },
      {
        property: "og:description",
        content: "Login to Janseva AI, the citizen grievance redressal portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});
