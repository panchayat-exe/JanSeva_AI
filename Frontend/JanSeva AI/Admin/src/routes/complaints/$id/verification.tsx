import { createFileRoute } from "@tanstack/react-router";
import { Verification } from "@/pages/complaints/Verification";

export const Route = createFileRoute("/complaints/$id/verification")({
  head: ({ params }) => ({
    meta: [
      { title: `Citizen Verification · ${params.id} | Janseva AI` },
      {
        name: "description",
        content: `Citizen verification outcome for complaint ${params.id} — accepted resolutions close automatically, rejections reopen the case.`,
      },
      { property: "og:title", content: `Citizen Verification · ${params.id} | Janseva AI` },
      {
        property: "og:description",
        content: "Citizen verification outcome for a municipal complaint resolution.",
      },
    ],
  }),
  component: Verification,
});