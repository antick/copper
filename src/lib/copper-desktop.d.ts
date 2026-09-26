declare global {
  interface Window {
    copperDesktop?: {
      pathForFile?: (file: File) => string;
      packaged: boolean;
      invoke: <T>(
        command: string,
        args?: Record<string, unknown>,
      ) => Promise<T>;
      on: (channel: string, handler: (payload: unknown) => void) => () => void;
    };
  }
}

export {};
