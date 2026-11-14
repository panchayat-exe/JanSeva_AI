import { createFileRoute } from "@tanstack/react-router";
import { GeoVision } from "@/pages/GeoVision";

export const Route = createFileRoute("/geovision")({
  // Accept ?focus=<complaintId> so ComplaintDetails "View on GeoVision" can
  // navigate directly to the map and auto-focus a specific complaint marker.
  validateSearch: (search: Record<string, unknown>) => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({
    meta: [
      { title: "GeoVision Ward Map | Janseva AI Government Portal" },
      {
        name: "description",
        content:
          "GeoVision maps live civic complaints across wards and sectors so officers can spot grievance clusters at a glance.",
      },
      { property: "og:title", content: "GeoVision Ward Map | Janseva AI" },
      {
        property: "og:description",
        content: "Ward-wise geospatial view of live civic complaints and grievance clusters.",
      },
    ],
  }),
  component: GeoVision,
});