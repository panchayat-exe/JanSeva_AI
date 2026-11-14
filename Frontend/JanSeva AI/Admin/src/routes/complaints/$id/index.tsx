import { createFileRoute } from "@tanstack/react-router";
import { ComplaintDetails } from "@/pages/complaints/ComplaintDetails";

export const Route = createFileRoute("/complaints/$id/")({
  head: ({ params }) => ({
    meta: [
      { title: `Complaint ${params.id} | Janseva AI Government Portal` },
      {
        name: "description",
        content: `Full grievance record for complaint ${params.id}: location, citizen description, evidence and action timeline.`,
      },
      { property: "og:title", content: `Complaint ${params.id} | Janseva AI` },
      {
        property: "og:description",
        content: "Grievance record with location, description and action timeline.",
      },
    ],
  }),
  component: ComplaintDetails,
});