import { EditorSelection } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";

const FENCED = [
  "Confirm the profile exists:",
  "",
  "```sh",
  "aws configure list-profiles",
  "```",
  "",
  "After",
].join("\n");

const MARKS = ["```", "const x = *not-em* and [[Wiki]] and `tick`", "```"].join(
  "\n",
);

function mount(doc: string, mode: "markdown" | "source" = "markdown") {
  const parent = document.createElement("div");
  parent.style.width = "640px";
  parent.style.height = "480px";
  document.body.append(parent);
  const view = createCopperEditor({ parent, doc, mode });
  return {
    view,
    cleanup() {
      view.destroy();
      parent.remove();
    },
  };
}

describe("live preview fenced code", () => {
  it("keeps fence chrome in layout and paints the command as code", () => {
    const { view, cleanup } = mount(FENCED);
    const codeLines = [...view.dom.querySelectorAll(".cm-copper-code-line")];
    expect(codeLines.length).toBeGreaterThanOrEqual(3);
    expect(
      codeLines.some((line) =>
        (line.textContent ?? "").includes("aws configure list-profiles"),
      ),
    ).toBe(true);
    expect(view.dom.querySelector(".cm-copper-code-meta")).not.toBeNull();
    expect(view.dom.querySelector(".cm-copper-block-add")).toBeNull();
    cleanup();
  });

  it("reveals raw fence ticks when the cursor is inside the block", () => {
    const { view, cleanup } = mount(FENCED);
    const command = view.state.doc.line(4);
    view.dispatch({ selection: EditorSelection.cursor(command.from) });
    expect(view.state.doc.toString()).toBe(FENCED);
    expect(view.dom.textContent).toContain("```sh");
    cleanup();
  });

  it("does not jump ArrowUp from later prose into the first fence", () => {
    const doc = [
      "Confirm the profile exists:",
      "",
      "```sh",
      "aws configure list-profiles",
      "```",
      "",
      "You should see:",
      "",
      "```",
      "example-development",
      "```",
      "",
      "Refresh the SSO session:",
    ].join("\n");
    const { view, cleanup } = mount(doc);
    const refresh = view.state.doc.line(13);
    view.dispatch({ selection: EditorSelection.cursor(refresh.from) });
    const previous = view.state.doc.line(refresh.number - 1);
    expect(previous.text).not.toBe("aws configure list-profiles");
    view.dispatch({ selection: EditorSelection.cursor(previous.from) });
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(
      12,
    );
    cleanup();
  });

  it("does not restyle markdown marks inside a fence", () => {
    const { view, cleanup } = mount(MARKS);
    expect(view.dom.querySelector(".cm-copper-wiki")).toBeNull();
    cleanup();
  });

  it("keeps raw fences in source view", () => {
    const { view, cleanup } = mount(FENCED, "source");
    expect(view.dom.querySelector(".cm-copper-code-line")).toBeNull();
    expect(view.state.doc.toString()).toContain("```sh");
    cleanup();
  });
});
