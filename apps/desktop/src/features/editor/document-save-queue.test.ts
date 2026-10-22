import { afterEach, expect, it, vi } from "vitest";
import {
  DocumentSaveQueue,
  documentSaveQueue,
  flushDocumentSaves,
} from "./document-save-queue";

afterEach(() => vi.useRealTimers());

it("waits for in-flight saves and serializes newer edits", async () => {
  let complete!: () => void;
  const save = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const queue = new DocumentSaveQueue(save, 400, "test-note");
  queue.schedule("one");
  const first = queue.flush();
  queue.schedule("two");
  let done = false;
  const second = queue.flush().then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  expect(save.mock.calls).toEqual([["one"]]);
  complete();
  await Promise.all([first, second]);
  expect(save.mock.calls).toEqual([["one"], ["two"]]);
  expect(queue.hasPending()).toBe(false);
});

it("retains failed saves after the editor detaches and blocks global flush", async () => {
  const save = vi.fn().mockRejectedValue(new Error("Disk full"));
  const queue = new DocumentSaveQueue(save, 400, "test-note");
  queue.schedule("Keep this draft");
  await expect(queue.flush()).rejects.toThrow("Disk full");
  await expect(flushDocumentSaves()).rejects.toThrow("Disk full");
  expect(queue.hasPending()).toBe(true);
  save.mockResolvedValue(undefined);
  await flushDocumentSaves();
  expect(queue.hasPending()).toBe(false);
});

it("waits for this Vault while leaving other Vault queues untouched", async () => {
  const vaultA = "queue-vault-a";
  const vaultB = "queue-vault-b";
  const saveA = vi.fn().mockRejectedValue(new Error("A is unavailable"));
  let completeB!: () => void;
  const saveB = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeB = resolve;
      }),
  );
  const queueA = new DocumentSaveQueue(saveA, 400, "a-note", vaultA);
  const queueB = new DocumentSaveQueue(saveB, 400, "b-note", vaultB);
  queueA.schedule("A draft");
  await expect(queueA.flush()).rejects.toThrow("A is unavailable");
  queueB.schedule("B edit");

  try {
    let finished = false;
    let flushError: unknown;
    const flushingB = flushDocumentSaves(vaultB).then(
      () => {
        finished = true;
      },
      (error) => {
        flushError = error;
      },
    );
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(saveA).toHaveBeenCalledTimes(1);
    expect(saveB).toHaveBeenCalledWith("B edit");
    completeB();
    await flushingB;
    expect(flushError).toBeUndefined();
    expect(finished).toBe(true);
    expect(queueA.hasPending()).toBe(true);
  } finally {
    queueA.cancel();
    queueB.cancel();
  }
});

it("pauses autosave and unmount flushing until the user resolves a conflict", async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(undefined);
  const queue = new DocumentSaveQueue(save, 400, "test-note");
  queue.schedule("My version");
  queue.pause();
  await vi.advanceTimersByTimeAsync(1000);
  expect(save).not.toHaveBeenCalled();
  await expect(queue.flush()).rejects.toThrow(/changed on disk/i);
  queue.resume();
  await queue.flush();
  expect(save).toHaveBeenCalledWith("My version");
});

it("keeps one queue after StrictMode detaches and reattaches an editor", async () => {
  const save = vi.fn().mockRejectedValue(new Error("Disk full"));
  const first = documentSaveQueue("strict-note", save, 400);
  first.attach();
  first.detach();
  first.attach();
  first.schedule("Retained draft");
  await expect(first.flush()).rejects.toThrow("Disk full");
  first.detach();
  const reopened = documentSaveQueue("strict-note", save, 400);
  expect(reopened).toBe(first);
  reopened.cancel();
  await reopened.settle();
});
