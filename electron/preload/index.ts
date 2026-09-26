import { contextBridge, ipcRenderer, webUtils } from "electron";
import { validateInvocation } from "../../src/lib/copper/command-contract";
import { safeExternalUrl } from "../../src/lib/safe-url";

export type CopperDesktopApi = {
  packaged: boolean;
  pathForFile: (file: File) => string;
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  on: (channel: string, handler: (payload: unknown) => void) => () => void;
};

const allowedSubscribe = new Set(["vault://fs"]);

const api: CopperDesktopApi = {
  pathForFile: (file) => webUtils.getPathForFile(file),
  packaged: !process.env.ELECTRON_RENDERER_URL,
  invoke: async (command, args) => {
    const result = await ipcRenderer.invoke(
      "copper:invoke",
      command,
      validateInvocation(command, args),
    );
    if (result && typeof result === "object" && "__copperError" in result) {
      const error = (
        result as { __copperError: { code: string; message: string } }
      ).__copperError;
      const thrown = new Error(error.message);
      (thrown as Error & { code: string }).code = error.code;
      throw thrown;
    }
    return result as never;
  },
  on: (channel, handler) => {
    if (!allowedSubscribe.has(channel)) {
      return () => undefined;
    }
    const listener = (_event: unknown, payload: unknown) => {
      handler(payload);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld("copperDesktop", api);

window.addEventListener(
  "click",
  (event) => {
    if (!event.isTrusted || event.defaultPrevented || event.button !== 0)
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    const href = link?.getAttribute("href");
    const url = href ? safeExternalUrl(href) : undefined;
    if (!url) return;
    event.preventDefault();
    void ipcRenderer.invoke("copper:open-external", url).catch(() => undefined);
  },
  true,
);
