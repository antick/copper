import {
  DOCUMENT_CONFLICT_MESSAGE,
  DOCUMENT_SAVE_DELAY_MS,
  DOCUMENT_SAVE_STATE_EVENT,
} from "../../../shared/document-save";

type Save = (contents: string) => Promise<void>;
const pendingQueues = new Set<DocumentSaveQueue>();
const keyedQueues = new Map<string, DocumentSaveQueue>();
const queueRegistryKey = (key: string, vaultId?: string) =>
  JSON.stringify([vaultId, key]);

function notify() {
  window.dispatchEvent(new Event(DOCUMENT_SAVE_STATE_EVENT));
}

export class DocumentSaveQueue {
  private pending: string | undefined;
  private running: Promise<void> | undefined;
  private timer: number | undefined;
  private paused = false;
  private generation = 0;
  private users = 0;
  error: unknown;

  constructor(
    private save: Save,
    private delayMs = DOCUMENT_SAVE_DELAY_MS,
    readonly key?: string,
    readonly vaultId?: string,
  ) {}

  configure(save: Save, delayMs: number) {
    this.save = save;
    this.delayMs = delayMs;
  }

  attach() {
    this.users++;
    if (this.key)
      keyedQueues.set(queueRegistryKey(this.key, this.vaultId), this);
  }

  detach() {
    this.users--;
    if (!this.paused) void this.flush().catch(() => undefined);
    this.release();
  }

  private release() {
    if (!this.hasPending()) {
      pendingQueues.delete(this);
      const registryKey = this.key && queueRegistryKey(this.key, this.vaultId);
      if (!this.users && registryKey && keyedQueues.get(registryKey) === this)
        keyedQueues.delete(registryKey);
    }
  }

  schedule = (contents: string) => {
    this.pending = contents;
    if (this.key) pendingQueues.add(this);
    window.clearTimeout(this.timer);
    if (!this.paused)
      this.timer = window.setTimeout(() => {
        void this.flush().catch(() => undefined);
      }, this.delayMs);
  };

  hasPending = () => this.pending !== undefined || this.running !== undefined;

  pause = () => {
    this.paused = true;
    window.clearTimeout(this.timer);
  };

  resume = () => {
    this.paused = false;
  };

  cancel = () => {
    this.generation++;
    window.clearTimeout(this.timer);
    this.pending = undefined;
    this.paused = false;
    this.error = undefined;
    this.release();
    notify();
  };

  settle = () => this.running?.catch(() => undefined) ?? Promise.resolve();

  flush = (): Promise<void> => {
    window.clearTimeout(this.timer);
    if (this.paused)
      return Promise.reject(new Error(DOCUMENT_CONFLICT_MESSAGE));
    if (this.running) return this.running.then(() => this.flush());
    if (this.pending === undefined) return Promise.resolve();
    this.error = undefined;
    this.running = this.drain().finally(() => {
      this.running = undefined;
      this.release();
      notify();
    });
    return this.running;
  };

  private async drain() {
    while (this.pending !== undefined && !this.paused) {
      const contents = this.pending;
      const generation = this.generation;
      this.pending = undefined;
      try {
        await this.save(contents);
      } catch (error) {
        if (generation === this.generation) this.pending ??= contents;
        this.error = error;
        throw error;
      }
    }
    if (this.paused) throw new Error(DOCUMENT_CONFLICT_MESSAGE);
  }
}

export function documentSaveQueue(
  key: string | undefined,
  save: Save,
  delayMs: number,
  vaultId?: string,
) {
  const registryKey = key ? queueRegistryKey(key, vaultId) : undefined;
  let queue = registryKey ? keyedQueues.get(registryKey) : undefined;
  if (!queue) {
    queue = new DocumentSaveQueue(save, delayMs, key, vaultId);
    if (registryKey) keyedQueues.set(registryKey, queue);
  }
  return queue;
}

export function flushDocumentSaves(vaultId?: string) {
  const queues = [...pendingQueues].filter(
    (queue) => vaultId === undefined || queue.vaultId === vaultId,
  );
  return Promise.all(queues.map((queue) => queue.flush())).then(
    () => undefined,
  );
}
