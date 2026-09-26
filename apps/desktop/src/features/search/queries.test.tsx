import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useNoteList } from "@/features/search/queries";

const copperMock = vi.hoisted(() => ({
  files: {
    tree: vi.fn(),
  },
  search: {
    notes: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock("@/lib/copper", () => ({ copper: copperMock }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function Probe({
  vaultId,
  scope,
  search,
}: {
  vaultId: string;
  scope: string;
  search: string;
}) {
  const notes = useNoteList(vaultId, scope, search);
  return (
    <div>
      {notes.isPending ? (
        <span data-testid="loading">Loading notes…</span>
      ) : null}
      {(notes.data ?? []).map((note) => (
        <span key={note.path}>{note.path}</span>
      ))}
    </div>
  );
}

function renderProbe(props: {
  vaultId: string;
  scope: string;
  search: string;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <Probe {...props} />
      </QueryClientProvider>,
    ),
  };
}

function tree(...paths: string[]) {
  return {
    name: "Vault",
    path: "",
    kind: "directory" as const,
    children: paths.map((path) => ({
      name: path.split("/").at(-1) ?? path,
      path,
      kind: "file" as const,
    })),
  };
}

describe("useNoteList scope transitions", () => {
  it("merges root and nested notes when no folder is selected", async () => {
    copperMock.files.tree.mockResolvedValue(
      tree("root.md", "Projects/tree-note.md"),
    );
    copperMock.search.notes.mockResolvedValue([
      {
        path: "Projects/indexed-only.md",
        title: "Indexed only",
        snippet: "",
        tags: [],
        mtimeNs: 2,
      },
    ]);

    renderProbe({ vaultId: "vault", scope: "all", search: "" });

    expect(await screen.findByText("root.md")).toBeInTheDocument();
    expect(screen.getByText("Projects/tree-note.md")).toBeInTheDocument();
    expect(screen.getByText("Projects/indexed-only.md")).toBeInTheDocument();
    expect(copperMock.search.notes).toHaveBeenCalledWith("vault", "all");
  });

  it("does not render folder A rows while folder B is still loading", async () => {
    const folderB =
      deferred<
        {
          path: string;
          title: string;
          snippet: string;
          tags: string[];
          mtimeNs: number;
        }[]
      >();
    copperMock.files.tree.mockResolvedValue(tree("A/tree.md"));
    copperMock.search.notes.mockImplementation(
      (_vaultId: string, scope: string) =>
        scope === "A"
          ? Promise.resolve([
              {
                path: "A/indexed.md",
                title: "A indexed",
                snippet: "",
                tags: [],
                mtimeNs: 1,
              },
            ])
          : folderB.promise,
    );

    const view = renderProbe({ vaultId: "vault", scope: "A", search: "" });
    expect(await screen.findByText("A/indexed.md")).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={view.client}>
        <Probe vaultId="vault" scope="B" search="" />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("A/indexed.md")).not.toBeInTheDocument();
    expect(screen.queryByText("A/tree.md")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    folderB.resolve([
      {
        path: "B/indexed-only.md",
        title: "B indexed",
        snippet: "",
        tags: [],
        mtimeNs: 2,
      },
    ]);
    expect(await screen.findByText("B/indexed-only.md")).toBeInTheDocument();
  });

  it("drops search A rows before the delayed search B response resolves", async () => {
    const searchB =
      deferred<
        {
          path: string;
          title: string;
          snippet: string;
          tags: string[];
          mtimeNs: number;
        }[]
      >();
    copperMock.files.tree.mockResolvedValue(tree());
    copperMock.search.query.mockImplementation(
      (_vaultId: string, query: string) =>
        query === "A"
          ? Promise.resolve([
              {
                path: "A/search.md",
                title: "Search A",
                snippet: "",
                tags: [],
                mtimeNs: 1,
              },
            ])
          : searchB.promise,
    );

    const view = renderProbe({ vaultId: "vault", scope: "all", search: "A" });
    expect(await screen.findByText("A/search.md")).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={view.client}>
        <Probe vaultId="vault" scope="all" search="B" />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("A/search.md")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    searchB.resolve([
      {
        path: "B/search.md",
        title: "Search B",
        snippet: "",
        tags: [],
        mtimeNs: 2,
      },
    ]);
    expect(await screen.findByText("B/search.md")).toBeInTheDocument();
  });

  it("keeps search results inside the selected folder scope", async () => {
    copperMock.files.tree.mockResolvedValue(tree());
    copperMock.search.query.mockResolvedValue([
      {
        path: "Projects/match.md",
        title: "In scope",
        snippet: "needle",
        tags: [],
        mtimeNs: 2,
      },
      {
        path: "Inbox/match.md",
        title: "Out of scope",
        snippet: "needle",
        tags: [],
        mtimeNs: 1,
      },
    ]);

    renderProbe({ vaultId: "vault", scope: "Projects", search: "needle" });

    expect(await screen.findByText("Projects/match.md")).toBeInTheDocument();
    expect(screen.queryByText("Inbox/match.md")).not.toBeInTheDocument();
  });

  it("does not carry Vault A tree rows into a delayed Vault B query", async () => {
    const vaultBTree = deferred<ReturnType<typeof tree>>();
    const vaultBNotes =
      deferred<
        {
          path: string;
          title: string;
          snippet: string;
          tags: string[];
          mtimeNs: number;
        }[]
      >();
    copperMock.files.tree.mockImplementation((vaultId: string) =>
      vaultId === "A" ? Promise.resolve(tree("A/note.md")) : vaultBTree.promise,
    );
    copperMock.search.notes.mockImplementation((vaultId: string) =>
      vaultId === "A"
        ? Promise.resolve([
            {
              path: "A/indexed.md",
              title: "Vault A indexed",
              snippet: "",
              tags: [],
              mtimeNs: 1,
            },
          ])
        : vaultBNotes.promise,
    );

    const view = renderProbe({ vaultId: "A", scope: "all", search: "" });
    expect(await screen.findByText("A/indexed.md")).toBeInTheDocument();
    expect(await screen.findByText("A/note.md")).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={view.client}>
        <Probe vaultId="B" scope="all" search="" />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("A/indexed.md")).not.toBeInTheDocument();
    expect(screen.queryByText("A/note.md")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    vaultBNotes.resolve([
      {
        path: "B/indexed-only.md",
        title: "Vault B indexed",
        snippet: "",
        tags: [],
        mtimeNs: 2,
      },
    ]);
    expect(await screen.findByText("B/indexed-only.md")).toBeInTheDocument();

    vaultBTree.resolve(tree("B/note.md"));
    await waitFor(() => {
      expect(screen.queryByText("A/note.md")).not.toBeInTheDocument();
    });
  });
});
