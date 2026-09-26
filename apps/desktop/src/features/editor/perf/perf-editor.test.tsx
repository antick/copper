import type { EditorView } from "@codemirror/view";
import { render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";
import { generateMarkdown } from "@/features/editor/perf/generate-markdown";
import { PerfEditor } from "@/features/editor/perf/perf-editor";

describe("PerfEditor", () => {
  it("keeps the document in CodeMirror instead of React state", async () => {
    let renders = 0;
    let view: EditorView | undefined;

    function Probe() {
      renders += 1;
      const [doc] = useState("hello copper");
      return (
        <section data-testid="shell">
          <PerfEditor
            doc={doc}
            onReady={(ready) => {
              view = ready;
            }}
          />
        </section>
      );
    }

    render(<Probe />);
    await waitFor(() => expect(view).toBeDefined());
    const rendersAfterMount = renders;

    view?.dispatch({
      changes: { from: view.state.doc.length, insert: "!" },
    });

    expect(view?.state.doc.toString()).toBe("hello copper!");
    expect(renders).toBe(rendersAfterMount);
  });

  it("creates an editor for a generated 100 KB fixture without mirroring the string", () => {
    const doc = generateMarkdown(100 * 1024);
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = createCopperEditor({ parent, doc });

    expect(view.state.doc.length).toBe(doc.length);
    view.dispatch({ changes: { from: 0, insert: "x" } });
    expect(view.state.doc.sliceString(0, 1)).toBe("x");
    expect(view.state.doc.length).toBe(doc.length + 1);

    view.destroy();
    parent.remove();
  });
});
