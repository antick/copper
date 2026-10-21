import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { sortIssues } from "@/features/tasks/filter-issues";
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

it("keeps a pending drop in place when the board sorts by rank", async () => {
  const client = new QueryClient();
  const original = ["1", "2", "3"].map((id) => ({
    ...issue(`COPP-${id}`, "todo"),
    rank: id,
  }));
  client.setQueryData(taskKeys.issues("demo"), original);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveIssue("demo"), { wrapper });
  act(() =>
    result.current.mutate({ id: "COPP-3", input: { beforeId: "COPP-1" } }),
  );
  await waitFor(() => {
    const rows =
      client.getQueryData<TaskIssue[]>(taskKeys.issues("demo")) ?? [];
    expect(sortIssues(rows, "rank").map(({ id }) => id)).toEqual([
      "COPP-3",
      "COPP-1",
      "COPP-2",
    ]);
  });
});

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
      { ...original[0], status: "in_progress", rank: expect.any(String) },
    ]),
  );
  const pending = client.getQueryData<TaskIssue[]>(taskKeys.issues("demo"));
  expect((pending?.[1].rank ?? "") > original[1].rank).toBe(true);

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
    rank: id.slice(-1),
    created: "",
    updated: "",
    body: "",
  };
}
