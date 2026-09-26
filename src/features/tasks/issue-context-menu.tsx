import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  Clipboard,
  Copy,
  CopyPlus,
  ExternalLink,
  Flag,
  FolderKanban,
  Gauge,
  Tags,
} from "lucide-react";
import type { ReactElement } from "react";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/features/tasks/constants";
import {
  activeProjects,
  validStatusForProject,
  visibleProjectWorkflow,
  visibleStatusForProject,
} from "@/features/tasks/workflow";
import type {
  TaskIssue,
  TaskProject,
  UpdateIssueInput,
} from "@/lib/copper/tasks";

function MenuItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item
      className="copper-menu-item copper-menu-item-with-icon"
      onSelect={onSelect}
    >
      {children}
    </ContextMenu.Item>
  );
}

function PropertySubmenu({
  label,
  icon,
  options,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  options: { value: string | null; label: string }[];
  onSelect: (value: string | null) => void;
}) {
  return (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger className="copper-menu-item copper-menu-item-with-icon">
        {icon}
        {label}
        <span className="copper-menu-shortcut">›</span>
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal>
        <ContextMenu.SubContent className="copper-menu">
          {options.map((option) => (
            <ContextMenu.Item
              key={option.value ?? "none"}
              className="copper-menu-item copper-menu-item-with-icon"
              onSelect={() => onSelect(option.value)}
            >
              <span className="copper-menu-check" aria-hidden />
              {option.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  );
}

export function IssueContextMenu({
  issue,
  targets,
  projects,
  children,
  onOpenChange,
  onOpen,
  onOpenInNewTab,
  onUpdate,
  onEditLabels,
  onDuplicate,
}: {
  issue: TaskIssue;
  targets: TaskIssue[];
  projects: TaskProject[];
  children: ReactElement;
  onOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onOpenInNewTab: () => void;
  onUpdate: (ids: string[], input: UpdateIssueInput) => void;
  onEditLabels: (ids: string[]) => void;
  onDuplicate?: (issue: TaskIssue) => void;
}) {
  const selected = targets.length ? targets : [issue];
  const ids = selected.map((item) => item.id);
  const count = ids.length;
  const statusOptions = [
    ...ISSUE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
    ...projects.flatMap((project) =>
      visibleProjectWorkflow(project).map(({ id: value, label }) => ({
        value,
        label,
      })),
    ),
  ].filter(
    (option, index, options) =>
      options.findIndex((item) => item.value === option.value) === index &&
      selected.every((item) =>
        visibleStatusForProject(
          option.value,
          projects.find((project) => project.id === item.project),
        ),
      ),
  );
  const copyIds = () => void navigator.clipboard.writeText(ids.join("\n"));
  const copyReferences = () =>
    void navigator.clipboard.writeText(
      selected
        .map((item) => `[${item.id} ${item.title}](${item.path})`)
        .join("\n"),
    );

  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="copper-menu copper-issue-context-menu"
          aria-label={`Issue actions for ${count} issue${count === 1 ? "" : "s"}`}
        >
          <ContextMenu.Label className="copper-menu-label">
            {count === 1 ? issue.id : `${count} issues selected`}
          </ContextMenu.Label>
          <MenuItem onSelect={onOpen}>
            <ExternalLink size={14} strokeWidth={1.75} /> Open
          </MenuItem>
          <MenuItem onSelect={onOpenInNewTab}>
            <ExternalLink size={14} strokeWidth={1.75} /> Open in new tab
          </MenuItem>
          {onDuplicate ? (
            <MenuItem onSelect={() => onDuplicate(issue)}>
              <CopyPlus size={14} strokeWidth={1.75} /> Duplicate
            </MenuItem>
          ) : null}
          <ContextMenu.Separator className="copper-menu-separator" />
          <PropertySubmenu
            label="Set status"
            icon={<Gauge size={14} strokeWidth={1.75} />}
            options={statusOptions}
            onSelect={(status) =>
              status && onUpdate(ids, { status: status as TaskIssue["status"] })
            }
          />
          <PropertySubmenu
            label="Set priority"
            icon={<Flag size={14} strokeWidth={1.75} />}
            options={ISSUE_PRIORITIES.map((value) => ({
              value,
              label: PRIORITY_LABELS[value],
            }))}
            onSelect={(priority) =>
              priority &&
              onUpdate(ids, { priority: priority as TaskIssue["priority"] })
            }
          />
          <PropertySubmenu
            label="Move to project"
            icon={<FolderKanban size={14} strokeWidth={1.75} />}
            options={[
              { value: null, label: "No project" },
              ...activeProjects(projects).map((project) => ({
                value: project.id,
                label: project.title,
              })),
            ]}
            onSelect={(project) => {
              const owner = projects.find((item) => item.id === project);
              const compatible = selected.every((item) =>
                validStatusForProject(item.status, owner),
              );
              onUpdate(ids, {
                project,
                ...(compatible ? {} : { status: "todo" }),
              });
            }}
          />
          <MenuItem onSelect={() => onEditLabels(ids)}>
            <Tags size={14} strokeWidth={1.75} /> Set labels…
          </MenuItem>
          <ContextMenu.Separator className="copper-menu-separator" />
          <MenuItem onSelect={copyIds}>
            <Clipboard size={14} strokeWidth={1.75} /> Copy issue ID
          </MenuItem>
          <MenuItem onSelect={copyReferences}>
            <Copy size={14} strokeWidth={1.75} /> Copy Markdown reference
          </MenuItem>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
