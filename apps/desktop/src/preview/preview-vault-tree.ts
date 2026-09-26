export const PREVIEW_VAULT_TREE = {
  name: "demo-vault",
  path: "",
  kind: "directory",
  children: [
    {
      name: "Inbox",
      path: "Inbox",
      kind: "directory",
      children: ["copper.md", "quick-thought.md", "daily.md"].map((name) => ({
        name,
        path: `Inbox/${name}`,
        kind: "file",
      })),
    },
    {
      name: "assets",
      path: "assets",
      kind: "directory",
      children: [
        {
          name: "copper.png",
          path: "assets/copper.png",
          kind: "file",
          fileKind: "image",
          typeLabel: "PNG",
        },
      ],
    },
    {
      name: "attachments",
      path: "attachments",
      kind: "directory",
      children: [],
    },
    {
      name: "notes",
      path: "notes",
      kind: "directory",
      children: [
        {
          name: "essays",
          path: "notes/essays",
          kind: "directory",
          children: [],
        },
      ],
    },
    {
      name: "Projects",
      path: "Projects",
      kind: "directory",
      children: [
        {
          name: "Copper",
          path: "Projects/Copper",
          kind: "directory",
          children: [
            {
              name: "drafts",
              path: "Projects/Copper/drafts",
              kind: "directory",
              children: [
                {
                  name: "outline.md",
                  path: "Projects/Copper/drafts/outline.md",
                  kind: "file",
                },
              ],
            },
            {
              name: "architecture.md",
              path: "Projects/Copper/architecture.md",
              kind: "file",
              fileKind: "markdown",
              typeLabel: "MD",
            },
            {
              name: "app.ts",
              path: "Projects/Copper/app.ts",
              kind: "file",
              fileKind: "code",
              typeLabel: "TS",
            },
            {
              name: "config.json",
              path: "Projects/Copper/config.json",
              kind: "file",
              fileKind: "data",
              typeLabel: "JSON",
            },
          ],
        },
      ],
    },
    {
      name: "README",
      path: "README",
      kind: "file",
      fileKind: "text",
      typeLabel: "TXT",
    },
    {
      name: "Tasks",
      path: "Tasks",
      kind: "directory",
      children: [
        {
          name: "Issues",
          path: "Tasks/Issues",
          kind: "directory",
          children: ["DEMO-1-fast-board.md", "DEMO-2-projects.md"].map(
            (name) => ({
              name,
              path: `Tasks/Issues/${name}`,
              kind: "file",
              fileKind: "markdown",
              typeLabel: "MD",
            }),
          ),
        },
        {
          name: "Projects",
          path: "Tasks/Projects",
          kind: "directory",
          children: [
            {
              name: "copper.md",
              path: "Tasks/Projects/copper.md",
              kind: "file",
              fileKind: "markdown",
              typeLabel: "MD",
            },
          ],
        },
      ],
    },
  ],
};
