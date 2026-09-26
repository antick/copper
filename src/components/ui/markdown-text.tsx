import { parser } from "@lezer/markdown";
import type { ReactNode } from "react";
import { safeExternalUrl } from "@/lib/safe-url";

const HIDDEN_MARKS = new Set([
  "CodeMark",
  "EmphasisMark",
  "HeaderMark",
  "LinkMark",
  "ListMark",
  "QuoteMark",
  "URL",
]);

function renderNode(
  source: string,
  node: ReturnType<typeof parser.parse>["topNode"],
  key: string,
): ReactNode {
  if (HIDDEN_MARKS.has(node.name)) return null;
  const children: ReactNode[] = [];
  let cursor = node.from;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (cursor < child.from) children.push(source.slice(cursor, child.from));
    children.push(renderNode(source, child, `${key}-${child.from}`));
    cursor = child.to;
  }
  if (cursor < node.to) children.push(source.slice(cursor, node.to));

  if (node.name === "Document") return children;
  if (node.name === "Paragraph") return <p key={key}>{children}</p>;
  if (node.name === "StrongEmphasis")
    return <strong key={key}>{children}</strong>;
  if (node.name === "Emphasis") return <em key={key}>{children}</em>;
  if (node.name === "InlineCode") return <code key={key}>{children}</code>;
  if (node.name === "FencedCode" || node.name === "CodeBlock")
    return (
      <pre key={key}>
        <code>{children}</code>
      </pre>
    );
  if (node.name === "BulletList") return <ul key={key}>{children}</ul>;
  if (node.name === "OrderedList") return <ol key={key}>{children}</ol>;
  if (node.name === "ListItem") return <li key={key}>{children}</li>;
  if (node.name === "Blockquote")
    return <blockquote key={key}>{children}</blockquote>;
  if (node.name.startsWith("ATXHeading")) {
    const level = node.name.slice(-1);
    if (level === "1") return <h1 key={key}>{children}</h1>;
    if (level === "2") return <h2 key={key}>{children}</h2>;
    if (level === "3") return <h3 key={key}>{children}</h3>;
    if (level === "4") return <h4 key={key}>{children}</h4>;
    if (level === "5") return <h5 key={key}>{children}</h5>;
    return <h6 key={key}>{children}</h6>;
  }
  if (node.name === "Link") {
    const url = node.getChild("URL");
    const href = url
      ? safeExternalUrl(source.slice(url.from, url.to))
      : undefined;
    return href ? (
      <a key={key} href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <span key={key}>{children}</span>
    );
  }
  if (node.name === "HardBreak") return <br key={key} />;
  return <span key={key}>{children}</span>;
}

export function MarkdownText({ children }: { children: string }) {
  const tree = parser.parse(children);
  return (
    <div className="copper-markdown-text">
      {renderNode(children, tree.topNode, "markdown")}
    </div>
  );
}
