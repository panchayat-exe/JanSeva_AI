import { createFileRoute } from "@tanstack/react-router";
import { AssignOfficer } from "@/pages/complaints/AssignOfficer";

export const Route = createFileRoute("/complaints/$id/assign")({
  head: ({ params }) => ({
    meta: [
      { title: `Assign Engineer · ${params.id} | Janseva AI` },
      {
        name: "description",
        content: `Assign a field engineer to municipal complaint ${params.id} and notify them instantly.`,
      },
      { property: "og:title", content: `Assign Engineer · ${params.id} | Janseva AI` },
      {
        property: "og:description",
        content: "Assign a field engineer to a municipal complaint and notify them instantly.",
      },
    ],
  }),
  component: AssignOfficer,
});