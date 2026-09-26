import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { queryClient } from "@/app/query-client";
import { ActivityRail } from "@/components/shell/activity-rail";
import { NotesWorkspace } from "@/components/shell/notes-workspace";
import { StatusBar } from "@/components/shell/status-bar";
import { useAppShellCommands } from "@/components/shell/use-app-shell-commands";
import { useNoteWorkspaceActions } from "@/components/shell/use-note-workspace-actions";
import { CommandMenu } from "@/components/ui/command-menu";
import { VaultSearchDialog } from "@/components/ui/vault-search-dialog";
import { useVaultTree } from "@/features/file-tree/queries";
import {
  collectSupportedFilePaths,
  findFileNode,
  type SupportedFileKind,
} from "@/features/file-tree/types";
import {
  favoriteHits,
  isArchivedPath,
} from "@/features/search/notes-from-tree";
import { useNoteList } from "@/features/search/queries";
import { SettingsOverlay } from "@/features/settings/settings-overlay";
import {
  useSaveSettings,
  useSettings,
} from "@/features/settings/settings-provider";
import { emptySession, sessionReducer } from "@/features/tabs/session-reducer";
import {
  initialTaskTabsState,
  legacyTaskFields,
  legacyTaskTarget,
  taskTabId,
  taskTabsReducer,
} from "@/features/tasks/task-tabs";
import { TasksWorkspace } from "@/features/tasks/tasks-workspace";
import { copper } from "@/lib/copper";
import { guessPlatform } from "@/lib/copper/platform";
import type { WorkspaceMode } from "@/lib/copper/settings";
import type { IssueColumnId } from "@/lib/copper/task-settings";

export { uniqueNotePath } from "@/components/shell/use-note-workspace-actions";

export function AppShell({
  children,
  vaultName = "Vault",
  vaultId,
}: {
  children?: ReactNode;
  vaultName?: string;
  vaultId?: string;
}) {
  const navigate = useNavigate();
  const settings = useSettings();
  const saveSettings = useSaveSettings();
  const appInfo = useQuery({
    queryKey: ["app-info"],
    queryFn: () => copper.system.appInfo(),
  });
  const [session, dispatch] = useReducer(
    sessionReducer,
    emptySession,
    (initial) => ({
      ...initial,
      rightCollapsed:
        typeof window !== "undefined" && window.innerWidth <= 1100,
    }),
  );
  const sessionDirty = useRef(false);
  const validateRestoredSession = useRef(false);
  const [restoredVaultId, setRestoredVaultId] = useState<string | null>(null);
  function updateSession(action: Parameters<typeof sessionReducer>[1]) {
    if (action.type !== "restore") {
      sessionDirty.current = true;
    }
    dispatch(action);
  }
  const [nav, setNav] = useState("all");
  const [folder, setFolder] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [listSearchOpen, setListSearchOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [vaultSearchOpen, setVaultSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("notes");
  const [taskTabs, dispatchTaskTabs] = useReducer(
    taskTabsReducer,
    initialTaskTabsState,
  );
  const [taskProjectOrder, setTaskProjectOrder] = useState<string[]>([]);
  const [taskPinnedProjects, setTaskPinnedProjects] = useState<string[]>([]);
  const [taskListColumnWidths, setTaskListColumnWidths] = useState<
    Partial<Record<IssueColumnId, number>>
  >({});
  const [indexState, setIndexState] = useState<"idle" | "indexing" | "error">(
    "idle",
  );
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const searchRef = useRef<HTMLInputElement>(null);
  const allNotes = useNoteList(vaultId, "all", "");
  const archiveNotes = useNoteList(vaultId, "Archive", "");
  const vaultTree = useVaultTree(vaultId);
  const selectedPath = session.activePath;
  const selectedNode = findFileNode(vaultTree.data, selectedPath);
  const activeFileKind = fileKindForPath(selectedPath, selectedNode?.fileKind);
  const activeIsArchived = Boolean(
    selectedPath && isArchivedPath(selectedPath),
  );
  const activeIsMarkdown = activeFileKind === "markdown";
  const noteActions = useNoteWorkspaceActions({
    vaultId,
    session,
    nav,
    folder,
    notes: allNotes.data ?? [],
    activeIsMarkdown,
    updateSession,
  });

  useEffect(() => {
    setNav("all");
    setFolder("");
    setSearchInput("");
    if (vaultId) sessionStorage.setItem("copper:active-vault-id", vaultId);
  }, [vaultId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput), 150);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!vaultId) {
      return;
    }
    setRestoredVaultId(null);
    sessionDirty.current = false;
    setIndexState("indexing");
    void copper.search
      .indexVault(vaultId)
      .then(async () => {
        setIndexState("idle");
        await queryClient.invalidateQueries({
          queryKey: ["vault", vaultId, "notes"],
        });
      })
      .catch(() => setIndexState("error"));
    void copper.settings.loadSession(vaultId).then((saved) => {
      if (sessionDirty.current) {
        return;
      }
      sessionDirty.current = true;
      const activePath = saved.activePath ?? undefined;
      validateRestoredSession.current = true;
      setWorkspaceMode(saved.workspaceMode ?? "notes");
      dispatchTaskTabs({
        type: "restore",
        tabs: saved.tasksTabs,
        activeTabId: saved.activeTasksTabId,
        fallback: legacyTaskTarget(saved),
      });
      setTaskProjectOrder(saved.tasksProjectOrder);
      setTaskPinnedProjects(saved.tasksPinnedProjects);
      setTaskListColumnWidths(saved.tasksListColumnWidths);
      dispatch({
        type: "restore",
        session: {
          tabs: saved.tabs ?? [],
          activePath,
          leftCollapsed: saved.leftCollapsed,
          rightCollapsed:
            typeof window !== "undefined" && window.innerWidth <= 1100
              ? true
              : saved.rightCollapsed,
          favorites: saved.favorites ?? [],
        },
      });
      if (activePath) {
        noteActions.restoreHistory(activePath);
      }
      setRestoredVaultId(vaultId);
    });
    const unlisten = copper.events.listenToVaultEvents(vaultId);
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [noteActions.restoreHistory, vaultId]);

  useEffect(() => {
    if (
      !validateRestoredSession.current ||
      vaultTree.isPending ||
      !vaultTree.data ||
      archiveNotes.isPending
    )
      return;
    validateRestoredSession.current = false;
    const existing = new Set([
      ...collectSupportedFilePaths(vaultTree.data),
      ...(archiveNotes.data ?? []).map((note) => note.path),
    ]);
    for (const tab of session.tabs) {
      if (!existing.has(tab.path)) {
        sessionDirty.current = true;
        dispatch({ type: "remove", path: tab.path });
      }
    }
  }, [
    archiveNotes.data,
    archiveNotes.isPending,
    session.tabs,
    vaultTree.data,
    vaultTree.isPending,
  ]);

  useEffect(() => {
    if (!vaultId || restoredVaultId !== vaultId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void copper.settings.saveSession(vaultId, {
        tabs: session.tabs,
        activePath: session.activePath,
        leftCollapsed: session.leftCollapsed,
        rightCollapsed: session.rightCollapsed,
        favorites: session.favorites,
        workspaceMode,
        ...legacyTaskFields(
          taskTabs.tabs.find((tab) => tab.id === taskTabs.activeTabId)
            ?.target ?? taskTabs.tabs[0].target,
        ),
        tasksTabs: taskTabs.tabs,
        activeTasksTabId: taskTabs.activeTabId,
        tasksProjectOrder: taskProjectOrder,
        tasksPinnedProjects: taskPinnedProjects,
        tasksListColumnWidths: taskListColumnWidths,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    session,
    taskListColumnWidths,
    taskPinnedProjects,
    taskProjectOrder,
    taskTabs,
    vaultId,
    workspaceMode,
    restoredVaultId,
  ]);

  useAppShellCommands({
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
    onCreateNote: () => void noteActions.createNote(),
    onRenameFile: () => void noteActions.renameActiveFile(),
    onOpenVault: () => void navigate({ to: "/welcome" }),
  });

  const favoriteNotes = favoriteHits(session.favorites, allNotes.data ?? []);
  const listTitle = searchInput
    ? "Search"
    : nav === "favorites"
      ? "Favorites"
      : nav === "folder"
        ? folder || "Folder"
        : "All Notes";

  return (
    <div
      className="copper-shell"
      data-left-collapsed={session.leftCollapsed}
      data-right-collapsed={session.rightCollapsed || !activeIsMarkdown}
      data-platform={appInfo.data?.platform ?? guessPlatform()}
      data-navigation-layout={settings.navigationLayout}
      data-workspace-mode={workspaceMode}
    >
      <span
        className="copper-window-drag-lane"
        data-copper-drag-region
        aria-hidden="true"
      />
      <div className="copper-workspace">
        <ActivityRail
          platform={appInfo.data?.platform ?? guessPlatform()}
          notesActive={!settingsOpen && workspaceMode === "notes"}
          tasksActive={!settingsOpen && workspaceMode === "tasks"}
          settingsActive={settingsOpen}
          onOpenNotes={() => {
            setSettingsOpen(false);
            setWorkspaceMode("notes");
          }}
          onOpenTasks={() => {
            setSettingsOpen(false);
            setWorkspaceMode("tasks");
          }}
          onOpenVault={() => void navigate({ to: "/welcome" })}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {settingsOpen ? (
          <SettingsOverlay open onClose={() => setSettingsOpen(false)} />
        ) : workspaceMode === "tasks" && vaultId ? (
          <TasksWorkspace
            vaultId={vaultId}
            vaultName={vaultName}
            platform={appInfo.data?.platform ?? guessPlatform()}
            leftCollapsed={session.leftCollapsed}
            onToggleLeft={() => updateSession({ type: "toggle-left" })}
            tabsState={taskTabs}
            onTabsAction={dispatchTaskTabs}
            projectOrder={taskProjectOrder}
            pinnedProjects={taskPinnedProjects}
            listColumnWidths={taskListColumnWidths}
            onProjectOrderChange={setTaskProjectOrder}
            onPinnedProjectsChange={setTaskPinnedProjects}
            onListColumnWidthsChange={setTaskListColumnWidths}
          />
        ) : (
          <NotesWorkspace
            vaultId={vaultId}
            vaultName={vaultName}
            platform={appInfo.data?.platform ?? guessPlatform()}
            session={session}
            settings={settings}
            nav={nav}
            folder={folder}
            selectedPath={selectedPath}
            activeFileKind={activeFileKind}
            activeIsArchived={activeIsArchived}
            activeIsMarkdown={activeIsMarkdown}
            favoriteNotes={favoriteNotes}
            listTitle={listTitle}
            searchInput={searchInput}
            searchQuery={searchQuery}
            listSearchOpen={listSearchOpen}
            searchRef={searchRef}
            indexState={indexState}
            livePreviewEnabled={livePreviewEnabled}
            saveStatus={saveStatus}
            actions={noteActions}
            updateSession={updateSession}
            setNav={setNav}
            setFolder={setFolder}
            setSearchInput={setSearchInput}
            setListSearchOpen={setListSearchOpen}
            setLivePreviewEnabled={setLivePreviewEnabled}
            setSaveStatus={setSaveStatus}
            onSearch={() => setVaultSearchOpen(true)}
            onToggleNoteList={() =>
              saveSettings.mutate({
                ...settings,
                navigationLayout:
                  settings.navigationLayout === "note-list"
                    ? "tree"
                    : "note-list",
              })
            }
            onOpenInTasks={
              activeIsMarkdown && selectedPath?.startsWith("Tasks/")
                ? () => {
                    if (!vaultId || !selectedPath) {
                      return;
                    }
                    const path = selectedPath;
                    setSettingsOpen(false);
                    setWorkspaceMode("tasks");
                    void Promise.all([
                      copper.tasks.listIssues(vaultId),
                      copper.tasks.listProjects(vaultId),
                    ]).then(([issues, projects]) => {
                      const issue = issues.find((item) => item.path === path);
                      const matchedProject = projects.find(
                        (item) => item.path === path,
                      );
                      if (issue) {
                        dispatchTaskTabs({
                          type: "open-pinned",
                          id: taskTabId(),
                          target: { kind: "issue", issue: issue.id },
                        });
                      } else if (matchedProject) {
                        dispatchTaskTabs({
                          type: "open-pinned",
                          id: taskTabId(),
                          target: {
                            kind: "project",
                            project: matchedProject.id,
                            view: "overview",
                          },
                        });
                      }
                    });
                  }
                : undefined
            }
          >
            {children}
          </NotesWorkspace>
        )}
      </div>
      <StatusBar vaultId={vaultId} />
      <CommandMenu
        open={commandOpen || quickOpen}
        onClose={() => {
          setCommandOpen(false);
          setQuickOpen(false);
        }}
        platform={appInfo.data?.platform}
        extraItems={
          quickOpen
            ? (allNotes.data ?? []).map((note) => ({
                id: `note:${note.path}`,
                label: note.title || note.path,
                run: () => noteActions.openPinned(note.path),
              }))
            : []
        }
      />
      <VaultSearchDialog
        open={vaultSearchOpen}
        onOpenChange={setVaultSearchOpen}
        vaultId={vaultId}
        selectedPath={selectedPath}
        onOpen={noteActions.openPreview}
        onPin={noteActions.openPinned}
      />
    </div>
  );
}

function fileKindForPath(
  path: string | undefined,
  classified: SupportedFileKind | undefined,
): SupportedFileKind | undefined {
  if (classified) return classified;
  if (path && /\.(md|markdown)$/i.test(path)) return "markdown";
  return undefined;
}
