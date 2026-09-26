import { describe, expect, it } from "vitest";
import { createCopperEditor } from "@/features/editor/create-editor";

describe("viewport decorations", () => {
  it("marks wiki links inside the visible range", () => {
    const parent = document.createElement("div");
    parent.style.width = "640px";
    parent.style.height = "480px";
    document.body.append(parent);

    const view = createCopperEditor({
      parent,
      doc: "# Note\n\nSee [[Architecture]] and a fence:\n\n```ts\nconst n = 1;\n```\n",
    });

    expect(view.dom.querySelector(".cm-copper-wiki")).not.toBeNull();
    expect(view.dom.querySelector(".cm-copper-code-line")).not.toBeNull();

    view.destroy();
    parent.remove();
  });
});

it("does not request a remote note image before an explicit click", () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = createCopperEditor({
    parent,
    doc: "![shared](https://images.example.org/tracker.png)",
  });
  expect(view.dom.querySelector("img[src]")).toBeNull();
  const button = view.dom.querySelector(
    "button.copper-inline-image-load",
  ) as HTMLButtonElement;
  expect(button.textContent).toContain("images.example.org");
  button.click();
  expect(view.dom.querySelector("img[src]")?.getAttribute("src")).toBe(
    "https://images.example.org/tracker.png",
  );
  view.destroy();
  parent.remove();
});

it("blocks file and script image addresses", () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = createCopperEditor({
    parent,
    doc: "![x](file:///private/image.png)\n![x](javascript:alert)\n![x](//remote.test/image)",
  });
  expect(view.dom.querySelector("img[src]")).toBeNull();
  expect(view.dom.querySelector("button.copper-inline-image-load")).toBeNull();
  view.destroy();
  parent.remove();
});
