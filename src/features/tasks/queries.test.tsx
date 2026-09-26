import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { taskKeys, useMoveIssue } from "@/features/tasks/queries";
import type { TaskIssue } from "@/lib/copper/tasks";

let rejectMove: ((error: Error) => void) | undefined;

vi.mock("@/lib/copper", () => ({
  copper: {
    tasks: {
      moveIssue: () =>
        new Promise((_resolve, reject) => {
          rejectMove = reject;
        }),
    },
  },
}));

it("previews a move and restores the complete prior issue order on failure", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const original = [issue("COPP-1", "todo"), issue("COPP-2", "in_progress")];
  client.setQueryData(taskKeys.issues("demo"), original);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveIssue("demo"), { wrapper });

  act(() =>
    result.current.mutate({
      id: "COPP-1",
      input: { status: "in_progress", afterId: "COPP-2" },
    }),
  );
  await waitFor(() =>
    expect(client.getQueryData<TaskIssue[]>(taskKeys.issues("demo"))).toEqual([
      original[1],
      { ...original[0], status: "in_progress" },
    ]),
  );

  act(() => rejectMove?.(new Error("Disk is busy")));
  await waitFor(() =>
    expect(client.getQueryData(taskKeys.issues("demo"))).toEqual(original),
  );
  expect(result.current.error?.message).toBe("Disk is busy");
});

function issue(id: string, status: TaskIssue["status"]): TaskIssue {
  return {
    path: `${id}.md`,
    id,
    title: id,
    status,
    priority: "none",
    project: null,
    labels: [],
    due: null,
    rank: id,
    created: "",
    updated: "",
    body: "",
  };
}
