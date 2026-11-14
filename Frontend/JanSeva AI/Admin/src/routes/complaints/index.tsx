import { createFileRoute } from "@tanstack/react-router";
import { ComplaintsList } from "@/pages/complaints/ComplaintsList";

export const Route = createFileRoute("/complaints/")({
  head: () => ({
    meta: [
      { title: "All Complaints | Janseva AI Government Portal" },
      {
        name: "description",
        content:
          "Search, filter and export every citizen grievance registered with the municipal corporation on Janseva AI.",
      },
      { property: "og:title", content: "All Complaints | Janseva AI Government Portal" },
      {
        property: "og:description",
        content: "Search, filter and export citizen grievances by ward, category and priority.",
      },
    ],
  }),
  component: ComplaintsList,
});