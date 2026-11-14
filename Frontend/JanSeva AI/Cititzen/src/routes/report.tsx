import { createFileRoute } from "@tanstack/react-router";
import { ReportPage } from "@/pages/Report";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a Complaint | Janseva AI" },
      {
        name: "description",
        content:
          "Tell us about your problem by voice, text or photo. Janseva AI files the complaint with the right department.",
      },
      { property: "og:title", content: "Report a Complaint | Janseva AI" },
      {
        property: "og:description",
        content: "Speak, type or upload an image to raise a civic complaint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});
