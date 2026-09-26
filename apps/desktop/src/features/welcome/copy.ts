export const WELCOME_COPY = {
  heading: "Copper",
  thesis: "Notes live in a folder on this computer.",
  invitation: "Open a folder of Markdown files.",
  footnote: "Markdown stays on disk. Copper does not write into the folder.",
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
