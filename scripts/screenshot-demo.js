// Run only in the browser preview. Populate sample work through Copper's own bridge.
(async () => {
  if (
    new URLSearchParams(location.search).get("preview") !== "1" ||
    window.copperDesktop?.packaged !== false
  ) {
    throw new Error("Screenshot samples require Copper's demo preview.");
  }
  const invoke = window.copperDesktop.invoke;
  const samples = [
    {
      title: "Sketch the next release",
      status: "todo",
      priority: "high",
      labels: ["planning"],
    },
    {
      title: "Write the getting started guide",
      status: "todo",
      priority: "medium",
      labels: ["docs"],
    },
    {
      title: "Polish the welcome screen",
      status: "in_progress",
      priority: "high",
      labels: ["design"],
    },
    {
      title: "Review keyboard shortcuts",
      status: "in_review",
      priority: "medium",
      labels: ["ui"],
    },
    {
      title: "Choose the launch palette",
      status: "done",
      priority: "low",
      labels: ["design"],
    },
  ];
  const existing = await invoke("list_issues", {});
  for (const sample of samples) {
    if (!existing.some((issue) => issue.title === sample.title)) {
      await invoke("create_issue", { ...sample, project: "copper" });
    }
  }
  return (await invoke("list_issues", {})).length;
})();
