import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Circle,
  Flag,
  LoaderCircle,
  Tag,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import {
  ISSUE_PRIORITIES,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/features/tasks/constants";
import { ProjectIcon } from "@/features/tasks/project-icons";
import { formatTaskDate } from "@/features/tasks/task-selectors";
import type {
  IssuePriority,
  IssueStatus,
  ProjectStatus,
} from "@/lib/copper/tasks";

export function TaskStatus({
  value,
  label,
}: {
  value: IssueStatus;
  label: string;
}) {
  return (
    <span className="copper-task-property" data-status={value}>
      <Circle size={12} fill="currentColor" aria-hidden />
      {label}
    </span>
  );
}

export function TaskProjectStatus({ value }: { value: ProjectStatus }) {
  return (
    <span className="copper-task-property" data-project-status={value}>
      <Circle size={12} fill="currentColor" aria-hidden />
      {PROJECT_STATUS_LABELS[value]}
    </span>
  );
}

export function TaskPriorityIcon({ value }: { value: IssuePriority }) {
  return (
    <Flag
      className="copper-task-priority-icon"
      data-priority={value}
      size={13}
      aria-hidden
    />
  );
}

export const TASK_PRIORITY_OPTIONS = ISSUE_PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
  icon: <TaskPriorityIcon value={value} />,
}));

export function TaskPriority({ value }: { value: IssuePriority }) {
  return (
    <span className="copper-task-property" data-priority={value}>
      <TaskPriorityIcon value={value} />
      {PRIORITY_LABELS[value]}
    </span>
  );
}

export function TaskProjectChip({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: string;
}) {
  return (
    <span className="copper-task-property">
      <ProjectIcon name={icon} size={13} />
      {children}
    </span>
  );
}

export function TaskLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <span className="copper-task-labels">
      {labels.map((label) => (
        <span key={label} className="copper-task-label">
          {label}
        </span>
      ))}
    </span>
  );
}

export function TaskDate({ value }: { value: string | null }) {
  const formatted = formatTaskDate(value);
  if (!formatted) return null;
  return (
    <span className="copper-task-property">
      <CalendarDays size={13} aria-hidden />
      {formatted}
    </span>
  );
}

export function TaskProgress({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="copper-task-progress" title={label}>
      <span className="copper-task-progress-track" aria-hidden>
        <span style={{ width: `${value}%` }} />
      </span>
      <span>{label}</span>
    </span>
  );
}

export function TaskSelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  icon?: ReactNode;
}) {
  const selected = options.find((option) => option.value === value);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="copper-task-property-button"
          aria-label={label}
        >
          {selected?.icon ?? icon}
          <span>{selected?.label ?? value}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="copper-task-menu" sideOffset={5}>
          <DropdownMenu.Label className="copper-task-menu-label">
            {label}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={(next) => onChange(next as T)}
          >
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="copper-task-menu-item"
              >
                <span className="copper-task-menu-check">
                  <DropdownMenu.ItemIndicator>
                    <Check size={13} aria-hidden />
                  </DropdownMenu.ItemIndicator>
                </span>
                {option.icon}
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function TaskTextPopover({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  function changeOpen(next: boolean) {
    if (!next && draft !== value) onChange(draft);
    setOpen(next);
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="copper-task-property-button"
          aria-label={label}
        >
          <Tag size={13} aria-hidden />
          <span>{value || label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="copper-task-popover" sideOffset={5}>
          <label className="copper-task-field">
            <span>{label}</span>
            <input
              autoFocus
              value={draft}
              placeholder={placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  changeOpen(false);
                }
              }}
            />
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function TaskDatePopover({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="copper-task-property-button"
          aria-label={label}
        >
          <CalendarDays size={13} aria-hidden />
          <span>{formatTaskDate(value) || label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="copper-task-popover" sideOffset={5}>
          <label className="copper-task-field">
            <span>{label}</span>
            <input
              autoFocus
              type="date"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function TaskState({
  kind,
  title,
  detail,
  action,
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="copper-task-state"
      role={kind === "error" ? "alert" : "status"}
    >
      {kind === "loading" ? (
        <LoaderCircle className="copper-task-spinner" size={20} aria-hidden />
      ) : kind === "error" ? (
        <AlertTriangle size={20} aria-hidden />
      ) : (
        <Circle size={20} aria-hidden />
      )}
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
      {action}
    </div>
  );
}

export function TaskMutationError({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="copper-task-error" role="alert" aria-live="assertive">
      <AlertTriangle size={14} aria-hidden />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="copper-text-button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
