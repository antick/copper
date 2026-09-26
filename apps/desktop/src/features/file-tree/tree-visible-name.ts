export function treeVisibleName(
  name: string,
  kind: string,
  typeLabel?: string,
) {
  if (kind === "directory" || !typeLabel) {
    return name;
  }
  const separator = name.lastIndexOf(".");
  if (separator <= 0 || separator === name.length - 1) {
    return name;
  }
  return name.slice(0, separator);
}
