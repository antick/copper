import { EditorSelection } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";

describe("live preview markers", () => {
  it("hides heading hashes and frontmatter away from the cursor", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = createCopperEditor({
      parent,
      doc: "---\ntype: essay\n---\n\n# Title\n\nmore",
    });
    expect(view.dom.querySelector(".cm-copper-hidden-block")).not.toBeNull();
    view.dispatch({
      selection: EditorSelection.cursor(view.state.doc.length),
    });
    const hidden = view.dom.querySelector(".cm-copper-hidden-mark");
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveStyle({ width: "0px" });
    const hiddenBlock = view.dom.querySelector(".cm-copper-hidden-block");
    expect(hiddenBlock).not.toBeNull();
    expect((hiddenBlock as HTMLElement).offsetHeight).toBe(0);
    view.destroy();
    parent.remove();
  });
});
