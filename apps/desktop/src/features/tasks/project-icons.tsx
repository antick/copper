import {
  Atom,
  Binoculars,
  Blocks,
  BookOpen,
  Box,
  BriefcaseBusiness,
  CircleDotDashed,
  Code2,
  Compass,
  Cpu,
  FlaskConical,
  Folder,
  FolderKanban,
  Gamepad2,
  Gem,
  Globe2,
  Heart,
  type LucideIcon,
  Megaphone,
  Palette,
  Rocket,
  Shapes,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

export const DEFAULT_PROJECT_ICON = "folder";

export function explicitProjectIcon(id: string) {
  return id === "shapes" ? "lucide:shapes" : id;
}

export const PROJECT_ICONS: ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "folder", label: "Folder", icon: Folder },
  { id: "shapes", label: "Shapes", icon: Shapes },
  { id: "bullseye", label: "Target", icon: Target },
  { id: "rocket", label: "Rocket", icon: Rocket },
  { id: "sparkles", label: "Sparkles", icon: Sparkles },
  { id: "compass", label: "Compass", icon: Compass },
  { id: "folder-kanban", label: "Project", icon: FolderKanban },
  { id: "briefcase", label: "Business", icon: BriefcaseBusiness },
  { id: "users", label: "Team", icon: Users },
  { id: "code", label: "Code", icon: Code2 },
  { id: "blocks", label: "Blocks", icon: Blocks },
  { id: "cpu", label: "Technology", icon: Cpu },
  { id: "atom", label: "Science", icon: Atom },
  { id: "flask", label: "Experiment", icon: FlaskConical },
  { id: "shield", label: "Security", icon: ShieldCheck },
  { id: "globe", label: "Global", icon: Globe2 },
  { id: "megaphone", label: "Marketing", icon: Megaphone },
  { id: "palette", label: "Design", icon: Palette },
  { id: "book", label: "Knowledge", icon: BookOpen },
  { id: "gamepad", label: "Game", icon: Gamepad2 },
  { id: "heart", label: "Heart", icon: Heart },
  { id: "binoculars", label: "Explore", icon: Binoculars },
  { id: "box", label: "Box", icon: Box },
  { id: "gem", label: "Gem", icon: Gem },
  { id: "zap", label: "Zap", icon: Zap },
  { id: "circle-dot", label: "Circle", icon: CircleDotDashed },
];

export function ProjectIcon({
  name,
  size = 14,
}: {
  name?: string;
  size?: number;
}) {
  if (name?.startsWith("emoji:")) {
    return (
      <span
        className="copper-project-emoji"
        style={{ fontSize: size }}
        aria-hidden
      >
        {name.slice(6)}
      </span>
    );
  }
  const normalized = name?.startsWith("lucide:")
    ? name.slice(7)
    : name === "target" || name === "shapes"
      ? DEFAULT_PROJECT_ICON
      : name;
  const Icon =
    PROJECT_ICONS.find((option) => option.id === normalized)?.icon ?? Folder;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}
