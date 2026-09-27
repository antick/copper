export const WELCOME_COPY = {
  heading: "Copper",
  thesis: "Your notes, tasks, and projects. On this computer.",
  invitation: "Open a folder of Markdown files.",
  footnote: "Notes and tasks stay yours, as Markdown files on disk.",
  openVault: "Open Vault",
  recentHeading: "Recent Vaults",
  settings: "Settings",
  chooseVault: "Choose a Vault",
  opening: "Opening Vault…",
  couldNotOpen: "Couldn’t open Vault",
  openFailed: "The Vault could not be opened.",
} as const;

export function welcomeOpenError(error: unknown): string {
  return error instanceof Error ? error.message : WELCOME_COPY.openFailed;
}
