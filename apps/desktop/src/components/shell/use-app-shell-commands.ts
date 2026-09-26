import { type Dispatch, type SetStateAction, useEffect } from "react";
import {
  commandFromKeyboard,
  registerCommand,
  runCommand,
} from "@/app/commands/registry";
import {
  cycleTab,
  type SessionAction,
  type SessionState,
} from "@/features/tabs/session-reducer";
import {
  cycleTaskTab,
  type TaskTabsAction,
  type TaskTabsState,
} from "@/features/tasks/task-tabs";
import type { WorkspaceMode } from "@/lib/copper/settings";

function dispatchTaskEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

export function useAppShellCommands({
  session,
  taskTabs,
  workspaceMode,
  updateSession,
  dispatchTaskTabs,
  setWorkspaceMode,
  setSettingsOpen,
  setCommandOpen,
  setQuickOpen,
  setVaultSearchOpen,
  setLivePreviewEnabled,
  onCreateNote,
  onRenameFile,
  onOpenVault,
}: {
  session: SessionState;
  taskTabs: TaskTabsState;
  workspaceMode: WorkspaceMode;
  updateSession: Dispatch<SessionAction>;
  dispatchTaskTabs: Dispatch<TaskTabsAction>;
  setWorkspaceMode: Dispatch<SetStateAction<WorkspaceMode>>;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setCommandOpen: Dispatch<SetStateAction<boolean>>;
  setQuickOpen: Dispatch<SetStateAction<boolean>>;
  setVaultSearchOpen: Dispatch<SetStateAction<boolean>>;
  setLivePreviewEnabled: Dispatch<SetStateAction<boolean>>;
  onCreateNote: () => void;
  onRenameFile: () => void;
  onOpenVault: () => void;
}) {
  useEffect(() => {
    const openTasks = (event: string) => {
      setSettingsOpen(false);
      setWorkspaceMode("tasks");
      dispatchTaskEvent(event);
    };
    const unsubscribers = [
      registerCommand("toggle-left-sidebar", () =>
        updateSession({ type: "toggle-left" }),
      ),
      registerCommand("toggle-right-sidebar", () =>
        updateSession({ type: "toggle-right" }),
      ),
      registerCommand("command-palette", () => setCommandOpen(true)),
      registerCommand("quick-open", () => setQuickOpen(true)),
      registerCommand("global-search", () => setVaultSearchOpen(true)),
      registerCommand("new-note", onCreateNote),
      registerCommand("open-vault", onOpenVault),
      registerCommand("settings", () => setSettingsOpen(true)),
      registerCommand("close-tab", () => {
        if (workspaceMode === "tasks")
          dispatchTaskTabs({ type: "close", id: taskTabs.activeTabId });
        else if (session.activePath)
          updateSession({ type: "close", path: session.activePath });
      }),
      registerCommand("next-tab", () => {
        if (workspaceMode === "tasks") {
          const id = cycleTaskTab(taskTabs, 1);
          if (id) dispatchTaskTabs({ type: "activate", id });
        } else {
          const path = cycleTab(session, 1);
          if (path) updateSession({ type: "activate", path });
        }
      }),
      registerCommand("previous-tab", () => {
        if (workspaceMode === "tasks") {
          const id = cycleTaskTab(taskTabs, -1);
          if (id) dispatchTaskTabs({ type: "activate", id });
        } else {
          const path = cycleTab(session, -1);
          if (path) updateSession({ type: "activate", path });
        }
      }),
      registerCommand("toggle-live-preview", () =>
        setLivePreviewEnabled((value) => !value),
      ),
      registerCommand("rename-file", onRenameFile),
      registerCommand("search-in-file", () =>
        dispatchTaskEvent("copper:search-document"),
      ),
      registerCommand("save", () => dispatchTaskEvent("copper:save-document")),
      registerCommand("toggle-tasks", () => {
        setSettingsOpen(false);
        setWorkspaceMode((mode) => (mode === "tasks" ? "notes" : "tasks"));
      }),
      registerCommand("new-issue", () => openTasks("copper:new-issue")),
      registerCommand("new-project", () => openTasks("copper:new-project")),
      registerCommand("set-issue-status", () =>
        dispatchTaskEvent("copper:set-issue-status"),
      ),
      registerCommand("set-issue-priority", () =>
        dispatchTaskEvent("copper:set-issue-priority"),
      ),
      registerCommand("set-issue-labels", () =>
        dispatchTaskEvent("copper:set-issue-labels"),
      ),
      registerCommand("next-issue", () =>
        dispatchTaskEvent("copper:next-issue"),
      ),
      registerCommand("previous-issue", () =>
        dispatchTaskEvent("copper:previous-issue"),
      ),
      registerCommand("toggle-tasks-view", () =>
        dispatchTaskEvent("copper:toggle-tasks-view"),
      ),
    ];
    return () => {
      for (const stop of unsubscribers) stop();
    };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = commandFromKeyboard(event);
      if (!command || command === "search-in-file") return;
      event.preventDefault();
      runCommand(command);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
