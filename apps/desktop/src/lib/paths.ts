export function fileName(path: string): string {
  return path.split("/").at(-1) ?? path;
}

export function fileStem(path: string): string {
  const name = fileName(path);
  return name.replace(/\.[^.]+$/, "") || name;
}
