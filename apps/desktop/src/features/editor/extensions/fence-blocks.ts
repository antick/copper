import { type EditorState, StateField, type Text } from "@codemirror/state";
import { shouldLimitDecorations } from "@/features/editor/extensions/performance-mode";

export interface FenceBlock {
  openLine: number;
  closeLine: number | null;
}

export type FenceRole = "open" | "close" | "content";

function parseFence(
  text: string,
): { ch: string; len: number; info: string } | null {
  const trimmed = text.trimStart();
  if (trimmed.length < 3) {
    return null;
  }
  const ch = trimmed[0];
  if (ch !== "`" && ch !== "~") {
    return null;
  }
  let len = 0;
  while (len < trimmed.length && trimmed[len] === ch) {
    len += 1;
  }
  if (len < 3) {
    return null;
  }
  const info = trimmed.slice(len).trim();
  if (ch === "`" && info.includes("`")) {
    return null;
  }
  return { ch, len, info };
}

export function findFenceBlocks(doc: Text): FenceBlock[] {
  const blocks: FenceBlock[] = [];
  let open: { line: number; ch: string; len: number } | null = null;
  for (let line = 1; line <= doc.lines; line += 1) {
    const fence = parseFence(doc.line(line).text);
    if (!open) {
      if (fence) {
        open = { line, ch: fence.ch, len: fence.len };
      }
      continue;
    }
    if (
      fence &&
      fence.ch === open.ch &&
      fence.len >= open.len &&
      fence.info.length === 0
    ) {
      blocks.push({ openLine: open.line, closeLine: line });
      open = null;
    }
  }
  if (open) {
    blocks.push({ openLine: open.line, closeLine: null });
  }
  return blocks;
}

export function lineFenceRole(
  blocks: FenceBlock[],
  line: number,
  docLines: number,
): FenceRole | null {
  for (const block of blocks) {
    const end = block.closeLine ?? docLines;
    if (line < block.openLine || line > end) {
      continue;
    }
    if (line === block.openLine) {
      return "open";
    }
    if (block.closeLine != null && line === block.closeLine) {
      return "close";
    }
    return "content";
  }
  return null;
}

export function isPosInFence(doc: Text, pos: number, blocks: FenceBlock[]) {
  if (doc.length === 0 || blocks.length === 0) {
    return false;
  }
  const line = doc.lineAt(Math.min(Math.max(pos, 0), doc.length)).number;
  return lineFenceRole(blocks, line, doc.lines) != null;
}

function fencesForState(state: EditorState) {
  if (shouldLimitDecorations(state)) {
    return [];
  }
  return findFenceBlocks(state.doc);
}

export const fenceBlocksField = StateField.define<FenceBlock[]>({
  create(state) {
    return fencesForState(state);
  },
  update(blocks, tr) {
    return tr.docChanged ? fencesForState(tr.state) : blocks;
  },
});

export function fenceBlocksOf(state: EditorState) {
  return state.field(fenceBlocksField, false) ?? [];
}
