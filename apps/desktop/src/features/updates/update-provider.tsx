import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { copper } from "@/lib/copper";
import {
  UPDATE_CHECK_FOCUS_MIN_MS,
  UPDATE_CHECK_INTERVAL_MS,
} from "@/lib/updates/config";
import { confirmRestart } from "@/lib/updates/restart-prompt";

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string }
  | {
      kind: "downloading";
      version: string;
      received: number;
      total: number | null;
    }
  | { kind: "ready"; version: string }
  | { kind: "restarting"; version: string }
  | {
      kind: "error";
      phase: "check" | "download" | "install" | "restart";
      summary: string;
      detail: string;
      version?: string;
    };

interface UpdateContextValue {
  status: UpdateStatus;
  checkNow: () => Promise<void>;
  startUpdate: () => Promise<void>;
  requestRestart: () => Promise<void>;
  retryUpdate: () => Promise<void>;
}

const defaultValue: UpdateContextValue = {
  status: { kind: "idle" },
  checkNow: async () => undefined,
  startUpdate: async () => undefined,
  requestRestart: async () => undefined,
  retryUpdate: async () => undefined,
};

const UpdateContext = createContext<UpdateContextValue>(defaultValue);

function updateFailure(
  phase: Extract<UpdateStatus, { kind: "error" }>["phase"],
  error: unknown,
  version?: string,
): Extract<UpdateStatus, { kind: "error" }> {
  const detail =
    error instanceof Error
      ? error.stack || error.message
      : String(error || "No technical details were provided.");
  const networkFailure = /ENOTFOUND|ECONN|network|offline|internet/i.test(
    detail,
  );
  const summaries = {
    check: "Copper could not check for updates.",
    download: "Copper could not download the update.",
    install: "Copper could not install the update.",
    restart: "Copper could not restart to finish the update.",
  } as const;
  return {
    kind: "error",
    phase,
    summary: networkFailure
      ? "The update server could not be reached."
      : summaries[phase],
    detail,
    version,
  };
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus>({ kind: "idle" });
  const statusRef = useRef(status);
  const lastCheckRef = useRef(0);
  statusRef.current = status;

  const checkNow = useCallback(async () => {
    if (!copper.updates?.canCheckUpdates()) {
      return;
    }
    const current = statusRef.current.kind;
    if (
      current === "downloading" ||
      current === "ready" ||
      current === "restarting"
    ) {
      return;
    }

    setStatus({ kind: "checking" });
    try {
      const result = await copper.updates.checkForUpdate();
      lastCheckRef.current = Date.now();
      if (result.kind === "available") {
        setStatus({ kind: "available", version: result.version });
        return;
      }
      if (result.kind === "unavailable") {
        setStatus({ kind: "up-to-date" });
        return;
      }
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus(updateFailure("check", error));
    }
  }, []);

  const requestRestart = useCallback(async () => {
    const current = statusRef.current;
    const version =
      current.kind === "ready" ||
      (current.kind === "error" && current.phase === "restart")
        ? current.version
        : undefined;
    if (!version || !copper.updates) {
      return;
    }
    if (!confirmRestart(version)) {
      return;
    }
    setStatus({ kind: "restarting", version });
    try {
      await copper.updates.relaunchApp();
    } catch (error) {
      setStatus(updateFailure("restart", error, version));
    }
  }, []);

  const startUpdate = useCallback(async () => {
    const current = statusRef.current;
    if (current.kind === "ready") {
      await requestRestart();
      return;
    }
    if (current.kind !== "available" && current.kind !== "error") {
      return;
    }
    const version =
      current.kind === "available"
        ? current.version
        : (current.version ?? "the latest version");
    if (!copper.updates) {
      return;
    }
    setStatus({
      kind: "downloading",
      version,
      received: 0,
      total: null,
    });
    try {
      await copper.updates.downloadUpdate((received, total) => {
        setStatus({ kind: "downloading", version, received, total });
      });
    } catch (error) {
      setStatus(updateFailure("download", error, version));
      return;
    }
    try {
      await copper.updates.installUpdate();
    } catch (error) {
      setStatus(updateFailure("install", error, version));
      return;
    }
    setStatus({ kind: "ready", version });
    if (confirmRestart(version)) {
      setStatus({ kind: "restarting", version });
      try {
        await copper.updates.relaunchApp();
      } catch (error) {
        setStatus(updateFailure("restart", error, version));
      }
    }
  }, [requestRestart]);

  const retryUpdate = useCallback(async () => {
    const current = statusRef.current;
    if (current.kind !== "error") return;
    if (current.phase === "check") {
      await checkNow();
    } else if (current.phase === "restart") {
      await requestRestart();
    } else {
      await startUpdate();
    }
  }, [checkNow, requestRestart, startUpdate]);

  useEffect(() => {
    if (!copper.updates?.canCheckUpdates()) {
      return;
    }
    void checkNow();
    const interval = window.setInterval(() => {
      void checkNow();
    }, UPDATE_CHECK_INTERVAL_MS);
    const onFocus = () => {
      if (Date.now() - lastCheckRef.current >= UPDATE_CHECK_FOCUS_MIN_MS) {
        void checkNow();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkNow]);

  const value = useMemo(
    () => ({
      status,
      checkNow,
      startUpdate,
      requestRestart,
      retryUpdate,
    }),
    [status, checkNow, startUpdate, requestRestart, retryUpdate],
  );

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useUpdates() {
  return useContext(UpdateContext);
}
