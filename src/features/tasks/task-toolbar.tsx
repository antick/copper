import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  Filter,
  ListFilter,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import type {
  IssueFilter,
  IssueGroupBy,
  IssueSort,
} from "@/features/tasks/filter-issues";
import {
  TASK_VISIBLE_PROPERTIES,
  type TaskVisibleProperty,
} from "@/features/tasks/task-selectors";

const GROUPS: readonly { value: IssueGroupBy; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "project", label: "Project" },
  { value: "label", label: "Label" },
];

const FILTERS: readonly { value: IssueFilter; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "backlog", label: "Backlog" },
  { value: "done", label: "Completed" },
];

const SORTS: readonly { value: IssueSort; label: string }[] = [
  { value: "rank", label: "Manual" },
  { value: "updated", label: "Updated" },
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due date" },
  { value: "id", label: "Identifier" },
];

export const TaskToolbar = forwardRef<
  HTMLInputElement,
  {
    query: string;
    onQueryChange: (value: string) => void;
    filter: IssueFilter;
    onFilterChange: (value: IssueFilter) => void;
    groupBy: IssueGroupBy;
    onGroupByChange: (value: IssueGroupBy) => void;
    sort: IssueSort;
    onSortChange: (value: IssueSort) => void;
    visibleProperties: ReadonlySet<TaskVisibleProperty>;
    onToggleProperty: (value: TaskVisibleProperty) => void;
    children?: ReactNode;
  }
>(function TaskToolbar(
  {
    query,
    onQueryChange,
    filter,
    onFilterChange,
    groupBy,
    onGroupByChange,
    sort,
    onSortChange,
    visibleProperties,
    onToggleProperty,
    children,
  },
  ref,
) {
  return (
    <div className="copper-task-toolbar">
      <label className="copper-task-search">
        <Search size={14} aria-hidden />
        <input
          ref={ref}
          value={query}
          placeholder="Search issues…"
          aria-label="Search issues"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <kbd>/</kbd>
      </label>
      <TaskToolbarMenu
        label="Filter"
        icon={<Filter size={14} aria-hidden />}
        value={filter}
        options={FILTERS}
        onChange={onFilterChange}
      />
      <TaskToolbarMenu
        label="Group"
        icon={<ListFilter size={14} aria-hidden />}
        value={groupBy}
        options={GROUPS}
        onChange={onGroupByChange}
      />
      <TaskToolbarMenu
        label="Order"
        icon={<Filter size={14} aria-hidden />}
        value={sort}
        options={SORTS}
        onChange={onSortChange}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="copper-task-toolbar-button"
            aria-label="Display"
          >
            <SlidersHorizontal size={14} aria-hidden />
            Display
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="copper-task-menu" sideOffset={5}>
            <DropdownMenu.Label className="copper-task-menu-label">
              Visible properties
            </DropdownMenu.Label>
            {TASK_VISIBLE_PROPERTIES.map((property) => (
              <DropdownMenu.CheckboxItem
                key={property}
                className="copper-task-menu-item"
                checked={visibleProperties.has(property)}
                onCheckedChange={() => onToggleProperty(property)}
              >
                <span className="copper-task-menu-check">
                  <DropdownMenu.ItemIndicator>
                    <Check size={13} aria-hidden />
                  </DropdownMenu.ItemIndicator>
                </span>
                {property[0]?.toUpperCase()}
                {property.slice(1)}
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {children}
    </div>
  );
});

function TaskToolbarMenu<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const current = options.find((option) => option.value === value)?.label;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="copper-task-toolbar-button"
          aria-label={`${label}: ${current}`}
        >
          {icon}
          {label}: {current}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="copper-task-menu" sideOffset={5}>
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
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
