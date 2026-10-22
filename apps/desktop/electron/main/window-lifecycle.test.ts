import { describe, expect, it, vi } from "vitest";
import { bindWindowActivation } from "./window-lifecycle";

function createWindow() {
  return {
    destroyed: false,
    show: vi.fn(),
    isDestroyed() {
      return this.destroyed;
    },
  };
}

describe("main window activation", () => {
  it("replaces a destroyed window and reuses the live replacement", () => {
    const first = createWindow();
    first.destroyed = true;
    let onActivate: (() => void) | undefined;
    const app = {
      on: vi.fn((event: string, listener: () => void) => {
        if (event === "activate") onActivate = listener;
      }),
    };
    const create = vi.fn(createWindow);
    const setWatchWindow = vi.fn();

    bindWindowActivation({
      app,
      initialWindow: first,
      createWindow: create,
      setWatchWindow,
    });
    onActivate?.();
    onActivate?.();

    expect(create).toHaveBeenCalledTimes(1);
    const replacement = create.mock.results[0]?.value;
    expect(replacement).toBeDefined();
    expect(replacement?.show).toHaveBeenCalledTimes(1);
    expect(setWatchWindow).toHaveBeenCalledWith(replacement);
  });

  it("creates another replacement when the current window later closes", () => {
    const first = createWindow();
    first.destroyed = true;
    let onActivate: (() => void) | undefined;
    const app = {
      on: (_event: string, listener: () => void) => {
        onActivate = listener;
      },
    };
    const create = vi.fn(createWindow);
    const setWatchWindow = vi.fn();

    bindWindowActivation({
      app,
      initialWindow: first,
      createWindow: create,
      setWatchWindow,
    });
    onActivate?.();
    const replacement = create.mock.results[0]?.value;
    if (!replacement) throw new Error("Expected a replacement window");
    replacement.destroyed = true;
    onActivate?.();

    expect(create).toHaveBeenCalledTimes(2);
    expect(setWatchWindow).toHaveBeenLastCalledWith(
      create.mock.results[1]?.value,
    );
  });
});
