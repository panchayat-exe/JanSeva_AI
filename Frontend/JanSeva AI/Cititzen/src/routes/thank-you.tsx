import { createFileRoute } from "@tanstack/react-router";
import { ThankYouPage } from "@/pages/ThankYou";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Thank You | Janseva AI" },
      {
        name: "description",
        content:
          "Your complaint has been verified and closed. Rate the resolution to help improve public services.",
      },
      { property: "og:title", content: "Thank You | Janseva AI" },
      {
        property: "og:description",
        content: "Complaint verified and closed — rate the resolution quality.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThankYouPage,
});
