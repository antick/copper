import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";
import { generateMarkdown } from "@/features/editor/perf/generate-markdown";

function measure(label: string, bytes: number) {
  const doc = generateMarkdown(bytes);
  const parent = document.createElement("div");
  parent.style.width = "800px";
  parent.style.height = "600px";
  document.body.append(parent);

  const started = performance.now();
  const view = createCopperEditor({ parent, doc });
  const createMs = performance.now() - started;

  const typeStarted = performance.now();
  for (let i = 0; i < 10; i += 1) {
    view.dispatch({
      changes: { from: 0, insert: "x" },
    });
  }
  const typeMs = (performance.now() - typeStarted) / 10;

  const scrollStarted = performance.now();
  view.dispatch({
    effects: EditorView.scrollIntoView(view.state.doc.length),
  });
  const scrollMs = performance.now() - scrollStarted;

  view.destroy();
  parent.remove();

  return { label, bytes, createMs, typeMs, scrollMs };
}

describe("editor performance baseline", () => {
  it("records create/type/scroll timings for 100 KB, 1 MB, and 5 MB", () => {
    const hundred = measure("100KB", 100 * 1024);
    const meg = measure("1MB", 1 * 1024 * 1024);
    const five = measure("5MB", 5 * 1024 * 1024);

    console.info(JSON.stringify({ hundred, meg, five }, null, 2));

    expect(hundred.typeMs).toBeLessThan(50);
    expect(meg.typeMs).toBeLessThan(80);
    expect(five.typeMs).toBeLessThan(120);
  });

  it("keeps 25 MB typing inside a comfortable dispatch budget", () => {
    const abusive = measure("25MB", 25 * 1024 * 1024);
    console.info(JSON.stringify({ abusive }, null, 2));
    expect(abusive.typeMs).toBeLessThan(200);
  }, 60_000);
});
