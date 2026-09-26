import { describe, expect, it } from "vitest";
import {
  normalizeProjectNavigation,
  reorderProjectIds,
} from "@/features/tasks/task-project-navigation";
import type { TaskProject } from "@/lib/copper/tasks";

const projects = [project("one"), project("two"), project("three")];

describe("task project navigation", () => {
  it("keeps independent ordered and pinned project ids normalized", () => {
    expect(
      normalizeProjectNavigation(
        projects,
        ["two", "missing", "two", "one"],
        ["three", "missing", "three"],
      ),
    ).toMatchObject({
      projectOrder: ["two", "one", "three"],
      pinnedProjects: ["three"],
    });
  });

  it("reorders only known ids", () => {
    expect(reorderProjectIds(["one", "two", "three"], "three", "one")).toEqual([
      "three",
      "one",
      "two",
    ]);
    expect(reorderProjectIds(["one", "two"], "missing", "one")).toEqual([
      "one",
      "two",
    ]);
  });
});

function project(id: string): TaskProject {
  return {
    id,
    path: `Tasks/Projects/${id}.md`,
    title: id,
    status: "planned",
    labels: [],
    start: null,
    target: null,
    icon: "folder",
    counts: {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      canceled: 0,
    },
    body: `# ${id}\n`,
  };
}
