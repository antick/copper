export function generateMarkdown(targetBytes: number, seed = "copper"): string {
  const section = (n: number) => `## Heading ${n}

This is a long paragraph of sample Markdown used to exercise Copper's editor. It includes **bold**, *italic*, ~~strike~~, \`inline code\`, and a [link](https://example.com/${n}). Wiki link [[Architecture]] and a heading link [[projects/copper/architecture#Performance]] also appear here.

- list item ${n}.1
- list item ${n}.2
- [ ] unchecked task ${n}
- [x] checked task ${n}

> A blockquote that repeats enough text to keep the document dense without becoming a single giant line.

\`\`\`ts
export function sample${n}(value: number): number {
  return value * ${n};
}
\`\`\`

![fixture](https://placehold.co/80x40?text=${n})

#tag-${n} more text about Copper performance fixtures and live preview decorations.

`;

  const chunks = [
    `---\ntype: fixture\nstatus: generated\nseed: ${seed}\n---\n\n# Copper performance fixture\n\n`,
  ];
  let n = 1;
  let size = new TextEncoder().encode(chunks[0]).length;

  while (size < targetBytes) {
    const next = section(n);
    chunks.push(next);
    size += new TextEncoder().encode(next).length;
    n += 1;
  }

  return chunks.join("").slice(0, targetBytes);
}

export const FIXTURE_SIZES = {
  small: 10 * 1024,
  normal: 100 * 1024,
  large: 1 * 1024 * 1024,
  huge: 5 * 1024 * 1024,
  abusive: 25 * 1024 * 1024,
  abusive50: 50 * 1024 * 1024,
} as const;
