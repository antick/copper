import { EditorSelection } from "@codemirror/state";
import { describe, expect, it, vi } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";

function mount(doc: string) {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = createCopperEditor({ parent, doc });
  return {
    view,
    cleanup() {
      view.destroy();
      parent.remove();
    },
  };
}

describe("Copper markdown editor", () => {
  it("highlights wiki links and tags in the viewport", () => {
    const { view, cleanup } = mount(
      "# Title\nSee [[Architecture]] and #research\n",
    );
    expect(view.dom.querySelector(".cm-copper-wiki")).not.toBeNull();
    expect(view.dom.querySelector(".cm-copper-tag")).not.toBeNull();
    cleanup();
  });

  it("renders interactive task checkboxes", () => {
    const { view, cleanup } = mount("- [ ] write tests\n");
    const checkbox = view.dom.querySelector(
      ".cm-copper-task",
    ) as HTMLInputElement | null;
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);
    checkbox?.click();
    expect(view.state.doc.toString()).toContain("[x]");
    cleanup();
  });

  it("mounts source mode without Markdown transformations or a synthetic edit", async () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const onDocChanged = vi.fn();
    const view = createCopperEditor({
      parent,
      doc: "const wiki = '[[Not a link]]'; // #not-a-tag",
      path: "src/app.ts",
      mode: "source",
      onDocChanged,
    });
    await Promise.resolve();
    expect(view.dom.querySelector(".cm-lineNumbers")).not.toBeNull();
    expect(view.dom.querySelector(".cm-copper-wiki")).toBeNull();
    expect(view.dom.querySelector(".cm-copper-tag")).toBeNull();
    expect(onDocChanged).not.toHaveBeenCalled();
    view.destroy();
    parent.remove();
  });

  it("does not copy the document into a React-owned buffer on dispatch", () => {
    const { view, cleanup } = mount("hello");
    view.dispatch({
      changes: { from: view.state.doc.length, insert: "!" },
      selection: EditorSelection.cursor(view.state.doc.length + 1),
    });
    expect(view.state.doc.toString()).toBe("hello!");
    cleanup();
  });
});
