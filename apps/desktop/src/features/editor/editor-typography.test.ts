import { undo } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import { waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createCopperEditor } from "./create-editor";

it("refreshes typography without resetting text, selection, undo, or triggering a save", async () => {
  const originalStyle = document.documentElement.getAttribute("style");
  const parent = document.createElement("div");
  document.body.append(parent);
  const changed = vi.fn();
  const view = createCopperEditor({
    parent,
    doc: "one\ntwo",
    onDocChanged: changed,
    livePreviewEnabled: false,
  });
  try {
    view.dispatch({
      changes: { from: 7, insert: " draft" },
      selection: { anchor: 13 },
    });
    changed.mockClear();
    const initialTheme = view.dom.className;
    document.documentElement.style.setProperty("--editor-font-size", "22px");
    await waitFor(() => expect(view.dom.className).not.toBe(initialTheme));
    expect(EditorView.findFromDOM(view.contentDOM)).toBe(view);
    expect(view.state.doc.toString()).toBe("one\ntwo draft");
    expect(view.state.selection.main.anchor).toBe(13);
    expect(changed).not.toHaveBeenCalled();
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("one\ntwo");
    view.destroy();
    const dispatch = vi.spyOn(view, "dispatch");
    document.documentElement.style.setProperty("--editor-font-size", "16px");
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  } finally {
    view.destroy();
    parent.remove();
    if (originalStyle === null)
      document.documentElement.removeAttribute("style");
    else document.documentElement.setAttribute("style", originalStyle);
  }
});
