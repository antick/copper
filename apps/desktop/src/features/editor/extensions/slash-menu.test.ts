import { CompletionContext, startCompletion } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";
import { slashCompletions } from "@/features/editor/extensions/slash-menu";

describe("slash menu", () => {
  it("inserts a heading from a Markdown slash completion", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = createCopperEditor({
      parent,
      doc: "/",
      livePreviewEnabled: true,
    });
    view.dispatch({ selection: EditorSelection.cursor(1) });
    const result = slashCompletions(new CompletionContext(view.state, 1, true));
    expect(result?.options.some((item) => item.label === "Heading 2")).toBe(
      true,
    );
    const heading = result?.options.find((item) => item.label === "Heading 2");
    const insert = typeof heading?.apply === "string" ? heading.apply : "";
    view.dispatch({
      changes: { from: result?.from ?? 0, to: 1, insert },
    });
    expect(view.state.doc.toString()).toBe("## ");
    view.destroy();
    parent.remove();
  });

  it("does not complete in a source file", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = createCopperEditor({
      parent,
      doc: "/",
      path: "app.ts",
      mode: "source",
      livePreviewEnabled: false,
    });
    view.dispatch({ selection: EditorSelection.cursor(1) });
    startCompletion(view);
    expect(view.dom.querySelector(".cm-completionLabel")).toBeNull();
    view.destroy();
    parent.remove();
  });
});
