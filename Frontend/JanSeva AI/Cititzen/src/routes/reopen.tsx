import { createFileRoute } from "@tanstack/react-router";
import { ReopenPage } from "@/pages/Reopen";
import { z } from "zod";

export const Route = createFileRoute("/reopen")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Reopen Complaint | Janseva AI" },
      {
        name: "description",
        content:
          "Tell us why the problem is still unresolved and reopen your complaint for reassignment to the officer.",
      },
      { property: "og:title", content: "Reopen Complaint | Janseva AI" },
      {
        property: "og:description",
        content: "Share more details and reopen your civic complaint immediately.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReopenPage,
});

