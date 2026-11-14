import { createFileRoute } from "@tanstack/react-router";
import { AuditLogs } from "@/pages/AuditLogs";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs | JanSeva AI" },
      { name: "description", content: "System audit log — track all administrative and user actions." },
    ],
  }),
  component: AuditLogs,
});
