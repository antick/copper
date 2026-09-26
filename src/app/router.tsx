import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  history:
    typeof window !== "undefined" && window.location.protocol === "file:"
      ? createHashHistory()
      : undefined,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
