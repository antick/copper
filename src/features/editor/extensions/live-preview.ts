import { codeFences } from "@/features/editor/extensions/code-fences";
import { headings } from "@/features/editor/extensions/headings";
import { hiddenFrontmatter } from "@/features/editor/extensions/hidden-frontmatter";
import { livePreviewDecorations } from "@/features/editor/extensions/live-preview-decorations";
import { tasks } from "@/features/editor/extensions/tasks";

export function livePreview() {
  return [
    hiddenFrontmatter,
    livePreviewDecorations,
    tasks,
    headings,
    codeFences,
  ];
}
