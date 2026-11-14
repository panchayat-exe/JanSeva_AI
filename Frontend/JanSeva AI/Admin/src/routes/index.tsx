import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/pages/Login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Login | Janseva AI Government Portal" }],
  }),
  component: Login,
});
