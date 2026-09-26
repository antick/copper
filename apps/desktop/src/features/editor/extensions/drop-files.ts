import { EditorView } from "@codemirror/view";

export function dropFiles(onPaths: (paths: string[]) => void) {
  return EditorView.domEventHandlers({
    drop(event) {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) {
        return false;
      }
      const paths = [...files]
        .map(
          (file) =>
            window.copperDesktop?.pathForFile?.(file) ??
            (file as File & { path?: string }).path,
        )
        .filter((path): path is string => Boolean(path));
      if (paths.length === 0) {
        return false;
      }
      event.preventDefault();
      onPaths(paths);
      return true;
    },
  });
}
