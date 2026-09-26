import "@fontsource-variable/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "@/app/query-client";
import { router } from "@/app/router";
import "@/styles/globals.css";
import "@/styles/pane-resizer.css";
import "@/styles/welcome.css";
import "@/styles/editor.css";
import "@/styles/controls.css";
import "@/styles/tasks.css";
import "@/styles/task-surfaces.css";
import "@/styles/task-editor.css";
import "@/styles/task-management.css";
import "@/styles/issue-view.css";
import "@/styles/tasks-responsive.css";
import "@/styles/window-drag.css";
import "@/styles/settings-task.css";

async function boot() {
  const preview =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    !window.copperDesktop &&
    new URLSearchParams(window.location.search).has("preview");
  if (preview) {
    await import("@/preview/mock-desktop");
  }

  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Copper root element was not found");
  }

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void boot();
