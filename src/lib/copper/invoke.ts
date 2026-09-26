/** Command args are camelCase in the renderer. */
export function camelizeKeys(
  args?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!args) {
    return args;
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    const camel = key.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase(),
    );
    next[camel] = value;
  }
  return next;
}

export function copperInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const api = window.copperDesktop;
  if (!api) {
    return Promise.reject(new Error("Copper desktop bridge is unavailable"));
  }
  return api.invoke<T>(command, camelizeKeys(args));
}
