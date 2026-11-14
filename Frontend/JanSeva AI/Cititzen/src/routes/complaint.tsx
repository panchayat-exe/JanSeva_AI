import { createFileRoute } from "@tanstack/react-router";
import { ComplaintDetails } from "@/pages/Complaint";
import { z } from "zod";

export const Route = createFileRoute("/complaint")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Complaint Details | Janseva AI" },
      {
        name: "description",
        content:
          "Live status, engineer updates and evidence for your complaint — Janseva AI.",
      },
      { property: "og:title", content: "Complaint Details | Janseva AI" },
      {
        property: "og:description",
        content: "Track progress, latest updates and verification for your complaint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintDetails,
});

