function lineKind(line: string) {
  if (line.startsWith("+++") || line.startsWith("---")) return "file";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  if (line.startsWith("@@")) return "hunk";
  return "ctx";
}

export function GitDiffView({
  text,
  binary,
  empty,
}: {
  text?: string | null;
  binary?: boolean;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <p className="copper-empty">
        No local file is selected. Update will fetch remote notes.
      </p>
    );
  }
  if (binary) {
    return <p className="copper-empty">Binary file</p>;
  }
  if (!text) {
    return <p className="copper-empty">Select a file to review the diff.</p>;
  }
  return (
    <div className="copper-git-diff" role="region" aria-label="Diff">
      {text.split("\n").map((line, lineNumber) => (
        <span key={`L${String(lineNumber + 1)}`} data-kind={lineKind(line)}>
          {line.length === 0 ? " " : line}
        </span>
      ))}
    </div>
  );
}
