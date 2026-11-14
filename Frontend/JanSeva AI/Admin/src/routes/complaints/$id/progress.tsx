import { createFileRoute } from "@tanstack/react-router";
import { UpdateProgress } from "@/pages/complaints/UpdateProgress";

export const Route = createFileRoute("/complaints/$id/progress")({
  head: ({ params }) => ({
    meta: [
      { title: `Work Progress · ${params.id} | Janseva AI` },
      {
        name: "description",
        content: `Live field-work progress, engineer timeline and before/after evidence for complaint ${params.id}.`,
      },
      { property: "og:title", content: `Work Progress · ${params.id} | Janseva AI` },
      {
        property: "og:description",
        content: "Field-work timeline and before/after evidence uploaded by the engineer.",
      },
    ],
  }),
  component: UpdateProgress,
});