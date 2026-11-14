import { createFileRoute } from "@tanstack/react-router";
import { VerifyPage } from "@/pages/Verify";
import { z } from "zod";

export const Route = createFileRoute("/verify")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Resolution Verification | Janseva AI" },
      {
        name: "description",
        content:
          "Review before and after work evidence, AI verification summary, and confirm whether your complaint is resolved.",
      },
      { property: "og:title", content: "Resolution Verification | Janseva AI" },
      {
        property: "og:description",
        content: "Confirm or reopen your complaint after reviewing the repair evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

