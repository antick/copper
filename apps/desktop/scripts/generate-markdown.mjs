const SIZES = {
  "small.md": 10 * 1024,
  "normal.md": 100 * 1024,
  "large.md": 1 * 1024 * 1024,
  "huge.md": 5 * 1024 * 1024,
  "abusive.md": 25 * 1024 * 1024,
  "abusive-50mb.md": 50 * 1024 * 1024,
};

const SECTION = `## Heading {{n}}

This is a long paragraph of sample Markdown used to exercise Copper's editor. It includes **bold**, *italic*, ~~strike~~, \`inline code\`, and a [link](https://example.com/{{n}}). Wiki link [[Architecture]] and a heading link [[projects/copper/architecture#Performance]] also appear here.

- list item {{n}}.1
- list item {{n}}.2
- [ ] unchecked task {{n}}
- [x] checked task {{n}}

> A blockquote that repeats enough text to keep the document dense without becoming a single giant line.

\`\`\`ts
export function sample{{n}}(value: number): number {
  return value * {{n}};
}
\`\`\`

![fixture](https://placehold.co/80x40?text={{n}})

#tag-{{n}} more text about Copper performance fixtures and live preview decorations.

`;

export function generateMarkdown(targetBytes, seed = "copper") {
  const chunks = [
    `---\ntype: fixture\nstatus: generated\nseed: ${seed}\n---\n\n# Copper performance fixture\n\n`,
  ];
  let n = 1;
  let size = Buffer.byteLength(chunks[0], "utf8");

  while (size < targetBytes) {
    const section = SECTION.replaceAll("{{n}}", String(n));
    chunks.push(section);
    size += Buffer.byteLength(section, "utf8");
    n += 1;
  }

  const document = chunks.join("");
  return document.slice(0, targetBytes);
}

export { SIZES };
