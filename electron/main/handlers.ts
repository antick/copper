import { app, dialog } from "electron";
import { backlinksFor } from "../native/backlinks";
import { APP_NAME } from "../native/constants";
import { CopperError } from "../native/errors";
import { importAttachment } from "../native/files/attachments";
import {
  archiveFile,
  binaryMetadata,
  createFile,
  createFolder,
  readBinaryFile,
  readFile,
  renamePath,
  restoreFile,
  saveFile,
  trashPath,
} from "../native/files/service";
import { scanTree } from "../native/files/tree";
import {
  GitCommandError,
  inspectGitDiff,
  inspectGitStatus,
  publishGitVault,
} from "../native/git";
import { indexPathFor } from "../native/index/db";
import {
  indexFilePath,
  indexVault,
  rebuildIndex,
  removeIndexedPath,
} from "../native/index/indexer";
import {
  parseFrontmatter,
  writeFrontmatter,
} from "../native/markdown/frontmatter";
import { resolveInVault } from "../native/path";
import { notesInFolder, searchNotes } from "../native/search";
import {
  type CopperSettings,
  loadSession,
  loadSettings,
  saveSession,
  saveSettings,
  type VaultSession,
} from "../native/settings";
import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  updateProjectWorkflow,
} from "../native/tasks/project-service";
import {
  addIssueComment,
  createIssue,
  deleteIssueComment,
  getIssue,
  listIssues,
  moveIssue,
  updateIssue,
  updateIssueComment,
} from "../native/tasks/service";
import type {
  CreateIssueInput,
  CreateProjectInput,
  MoveIssueInput,
  UpdateIssueInput,
  UpdateProjectInput,
  UpdateProjectWorkflowInput,
} from "../native/tasks/types";
import { appState } from "./state";
import { stopVaultWatcher, watchVault } from "./watch";

function vaultRoot(vaultId: string): string {
  if (!appState.vaults) {
    throw CopperError.notFound("Vault is not open");
  }
  return appState.vaults.get(vaultId).path;
}

function dbPath(vaultId: string): string {
  return indexPathFor(appState.dataDir, vaultId);
}

function platformName(): string {
  if (process.platform === "darwin") return "macos";
  if (process.platform === "win32") return "windows";
  return "linux";
}

export async function handleCommand(
  command: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (typeof args.vaultId === "string") vaultRoot(args.vaultId);
  const str = (key: string) => String(args[key] ?? "");
  switch (command) {
    case "app_info":
      return {
        name: APP_NAME,
        version: app.getVersion(),
        platform: platformName(),
      };
    case "list_recent_vaults":
      return appState.vaults?.listRecent() ?? [];
    case "open_vault": {
      if (!appState.vaults) {
        throw CopperError.io("Vault manager is not ready");
      }
      const info = appState.vaults.openVault(str("path"));
      watchVault(info.path);
      return info;
    }
    case "close_vault":
      appState.gitTrust.revoke(vaultRoot(str("vaultId")));
      stopVaultWatcher();
      appState.vaults?.close(str("vaultId"));
      return null;
    case "pick_vault_folder": {
      const result = await dialog.showOpenDialog({
        title: "Open Vault",
        properties: ["openDirectory"],
      });
      if (result.canceled || !result.filePaths[0]) {
        return null;
      }
      if (!appState.vaults) throw CopperError.io("Vault manager is not ready");
      return appState.vaults.grantSelection(result.filePaths[0]);
    }
    case "vault_tree":
      return scanTree(vaultRoot(str("vaultId")));
    case "resolve_path":
      return resolveInVault(vaultRoot(str("vaultId")), str("path"));
    case "read_file":
      return readFile(vaultRoot(str("vaultId")), str("path"));
    case "binary_file_metadata":
      return binaryMetadata(vaultRoot(str("vaultId")), str("path"));
    case "read_binary_file":
      return readBinaryFile(vaultRoot(str("vaultId")), str("path"));
    case "save_file":
      return saveFile(vaultRoot(str("vaultId")), str("path"), str("contents"));
    case "create_file":
      return createFile(
        vaultRoot(str("vaultId")),
        str("path"),
        typeof args.contents === "string" ? args.contents : "",
      );
    case "create_folder":
      return createFolder(vaultRoot(str("vaultId")), str("path"));
    case "rename_path":
      return renamePath(vaultRoot(str("vaultId")), str("from"), str("to"));
    case "archive_file":
      return archiveFile(vaultRoot(str("vaultId")), str("path"));
    case "restore_file":
      return restoreFile(vaultRoot(str("vaultId")), str("path"));
    case "trash_path": {
      const { default: trash } = await import("trash");
      await trashPath(
        vaultRoot(str("vaultId")),
        str("path"),
        async (absolute) => {
          try {
            await trash([absolute]);
          } catch (error) {
            throw CopperError.io(
              `Could not move item to system Trash: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        },
      );
      return null;
    }
    case "import_attachment": {
      const result = await dialog.showMessageBox({
        type: "question",
        title: "Import attachment",
        message: "Copy this file into the vault?",
        detail: str("sourcePath"),
        buttons: ["Cancel", "Import"],
        defaultId: 0,
        cancelId: 0,
      });
      if (result.response !== 1) throw CopperError.invalid("Import canceled");
      return importAttachment(
        vaultRoot(str("vaultId")),
        str("attachmentFolder"),
        str("sourcePath"),
      );
    }
    case "rebuild_vault_index":
      return rebuildIndex(dbPath(str("vaultId")), vaultRoot(str("vaultId")));
    case "index_open_vault":
      return indexVault(dbPath(str("vaultId")), vaultRoot(str("vaultId")));
    case "index_file_path":
      indexFilePath(
        dbPath(str("vaultId")),
        vaultRoot(str("vaultId")),
        str("path"),
      );
      return null;
    case "remove_indexed_file":
      removeIndexedPath(dbPath(str("vaultId")), str("path"));
      return null;
    case "search_vault":
      return searchNotes(
        dbPath(str("vaultId")),
        str("query"),
        str("folder") === "Archive",
      );
    case "list_notes":
      vaultRoot(str("vaultId"));
      return notesInFolder(dbPath(str("vaultId")), str("folder"));
    case "read_properties": {
      const [source] = readFile(vaultRoot(str("vaultId")), str("path"));
      return parseFrontmatter(source);
    }
    case "update_properties": {
      const root = vaultRoot(str("vaultId"));
      const [source] = readFile(root, str("path"));
      const properties = args.properties as {
        raw: string;
        body: string;
        values: Record<string, unknown>;
      };
      const next = writeFrontmatter(properties, source);
      if (next !== source) {
        saveFile(root, str("path"), next);
      }
      return null;
    }
    case "list_backlinks":
      vaultRoot(str("vaultId"));
      return backlinksFor(dbPath(str("vaultId")), str("path"));
    case "load_settings":
      return loadSettings(appState.configDir);
    case "save_settings":
      saveSettings(appState.configDir, args.settings as CopperSettings);
      return null;
    case "load_session":
      return loadSession(appState.dataDir, str("vaultId"));
    case "save_session":
      saveSession(
        appState.dataDir,
        str("vaultId"),
        args.session as VaultSession,
      );
      return null;
    case "list_issues":
      vaultRoot(str("vaultId"));
      return listIssues(dbPath(str("vaultId")));
    case "get_issue":
      return getIssue(vaultRoot(str("vaultId")), str("id"));
    case "create_issue":
      return createIssue(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        args as unknown as CreateIssueInput,
        loadSettings(appState.configDir).issueIdPrefix,
      );
    case "update_issue":
      return updateIssue(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        args as unknown as UpdateIssueInput,
      );
    case "move_issue":
      return moveIssue(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        args as unknown as MoveIssueInput,
      );
    case "add_issue_comment":
      return addIssueComment(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        str("body"),
      );
    case "update_issue_comment":
      return updateIssueComment(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        str("commentId"),
        str("body"),
      );
    case "delete_issue_comment":
      return deleteIssueComment(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        str("commentId"),
      );
    case "list_projects":
      vaultRoot(str("vaultId"));
      return listProjects(dbPath(str("vaultId")));
    case "get_project":
      return getProject(vaultRoot(str("vaultId")), str("id"));
    case "create_project":
      return createProject(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        args as unknown as CreateProjectInput,
      );
    case "update_project":
      return updateProject(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        args as unknown as UpdateProjectInput,
      );
    case "update_project_workflow":
      return updateProjectWorkflow(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        args as unknown as UpdateProjectWorkflowInput,
      );
    case "archive_project":
      archiveProject(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
      );
      return null;
    case "delete_project": {
      const { default: trash } = await import("trash");
      await deleteProject(
        vaultRoot(str("vaultId")),
        dbPath(str("vaultId")),
        str("id"),
        async (absolute) => {
          try {
            await trash([absolute]);
          } catch (error) {
            throw CopperError.io(
              `Could not move project to system Trash: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        },
      );
      return null;
    }
    case "git_enable": {
      const root = vaultRoot(str("vaultId"));
      return appState.gitTrust.request(root, async () => {
        const result = await dialog.showMessageBox({
          type: "warning",
          title: "Enable Git",
          message: "Trust Git in this vault?",
          detail: `${root}\n\nGit configuration can run programs on your computer. Enable it only for a repository you trust. This permission lasts until you close the vault or quit Copper.`,
          buttons: ["Cancel", "Enable Git"],
          defaultId: 0,
          cancelId: 0,
        });
        return result.response === 1;
      });
    }
    case "git_status": {
      const root = vaultRoot(str("vaultId"));
      const state = appState.gitTrust.state(root);
      return state === "trusted"
        ? appState.gitTrust.run(root, () => inspectGitStatus(root))
        : { kind: state };
    }
    case "git_diff": {
      const root = vaultRoot(str("vaultId"));
      return appState.gitTrust.run(root, () =>
        inspectGitDiff(root, str("path")),
      );
    }
    case "git_publish": {
      const root = vaultRoot(str("vaultId"));
      appState.gitTrust.run(root, () => undefined);
      stopVaultWatcher();
      try {
        const result = await publishGitVault(root);
        if (result.kind === "error") {
          console.error(`git_publish failed (${result.reason})`);
        }
        return result;
      } catch (error) {
        if (error instanceof GitCommandError) {
          console.error(error.stderr || error.message);
          return {
            kind: "error",
            reason: error.reason,
            changedPaths: [],
            siblingPaths: [],
          };
        }
        throw error;
      } finally {
        watchVault(root);
      }
    }
    default:
      throw CopperError.invalid(`Unknown command: ${command}`);
  }
}
