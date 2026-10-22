import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  SettingsProvider,
  useSettings,
} from "@/features/settings/settings-provider";
import type { CopperSettings } from "@/lib/copper/settings";
import { FilesSettings } from "./files";

const mocks = vi.hoisted(() => ({
  disk: { attachmentFolder: "attachments" },
  save: vi.fn<(settings: CopperSettings) => Promise<void>>(),
}));
vi.mock("@/lib/copper", () => ({
  copper: {
    settings: {
      load: async () => mocks.disk,
      save: mocks.save,
    },
  },
}));

beforeEach(() => {
  mocks.disk = { attachmentFolder: "attachments" };
  mocks.save.mockReset();
});

function EffectiveFolder() {
  return (
    <output data-testid="effective-folder">
      {useSettings().attachmentFolder}
    </output>
  );
}

async function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SettingsProvider>
        <FilesSettings />
        <EffectiveFolder />
      </SettingsProvider>
    </QueryClientProvider>,
  );
  return screen.findByRole("textbox", { name: "Attachment folder" });
}

it("shows a failed save and returns the field to the folder still in use", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Disk is full"));
  const input = await mount();
  fireEvent.change(input, { target: { value: "images" } });
  fireEvent.blur(input);

  const error = await screen.findByRole("alert");
  expect(error).toHaveTextContent(/couldn’t save/i);
  await waitFor(() => expect(input).toHaveValue("attachments"));
  expect(screen.getByTestId("effective-folder")).toHaveTextContent(
    "attachments",
  );
  expect(input).toHaveAttribute("aria-describedby", error.id);
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toBeEnabled();

  mocks.save.mockRejectedValueOnce(new Error("Disk is still full"));
  fireEvent.change(input, { target: { value: "images/failed-again" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(input).toBeEnabled());
  expect(input).toHaveValue("attachments");
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t save/i);

  mocks.save.mockImplementationOnce(async (settings) => {
    mocks.disk = settings;
  });
  fireEvent.change(input, { target: { value: "images/retry" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  await waitFor(() => expect(input).toBeEnabled());
  expect(input).toHaveValue("images/retry");
  expect(screen.getByTestId("effective-folder")).toHaveTextContent(
    "images/retry",
  );
});

it("waits for a pending save and avoids duplicate blur or Enter submissions", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  mocks.save.mockImplementationOnce(async (settings) => {
    await pending;
    mocks.disk = settings;
  });
  const input = await mount();
  fireEvent.change(input, { target: { value: "images/pending" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(input).toBeDisabled());
  fireEvent.blur(input);
  fireEvent.keyDown(input, { key: "Enter" });
  expect(mocks.save).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
    await pending;
  });
  await waitFor(() => expect(input).toBeEnabled());
  expect(input).toHaveValue("images/pending");
  expect(screen.getByTestId("effective-folder")).toHaveTextContent(
    "images/pending",
  );
});
