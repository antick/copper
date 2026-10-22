export interface MainWindowLifecycleTarget {
  isDestroyed(): boolean;
  show(): void;
}

interface AppActivationSource {
  on(event: "activate", listener: () => void): unknown;
}

export function bindWindowActivation<Window extends MainWindowLifecycleTarget>({
  app,
  initialWindow,
  createWindow,
  setWatchWindow,
}: {
  app: AppActivationSource;
  initialWindow: Window;
  createWindow: () => Window;
  setWatchWindow: (window: Window) => void;
}): void {
  let currentWindow = initialWindow;
  app.on("activate", () => {
    if (currentWindow.isDestroyed()) {
      currentWindow = createWindow();
      setWatchWindow(currentWindow);
      return;
    }
    currentWindow.show();
  });
}
