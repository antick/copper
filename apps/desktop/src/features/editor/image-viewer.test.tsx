import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageViewer } from "@/features/editor/image-viewer";

const mocks = vi.hoisted(() => ({
  metadata: vi.fn(async () => ({ mimeType: "image/png", size: 8 })),
  read: vi.fn(async () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
  createUrl: vi.fn(() => "blob:copper-image"),
  revokeUrl: vi.fn(),
}));

vi.mock("@/lib/copper", () => ({
  copper: {
    files: {
      binaryMetadata: mocks.metadata,
      readBinary: mocks.read,
    },
  },
}));

beforeEach(() => {
  mocks.metadata.mockClear();
  mocks.read.mockClear();
  mocks.createUrl.mockClear();
  mocks.revokeUrl.mockClear();
  URL.createObjectURL = mocks.createUrl;
  URL.revokeObjectURL = mocks.revokeUrl;
});

describe("ImageViewer", () => {
  it("loads bounded bytes as a read-only object URL and revokes it on switch", async () => {
    const { rerender, unmount } = render(
      <ImageViewer vaultId="demo" path="assets/first.png" />,
    );
    expect(await screen.findByAltText("first.png")).toHaveAttribute(
      "src",
      "blob:copper-image",
    );
    expect(screen.getByText("Read-only")).toBeVisible();
    expect(mocks.metadata).toHaveBeenCalledWith("demo", "assets/first.png");

    rerender(<ImageViewer vaultId="demo" path="assets/second.png" />);
    await waitFor(() =>
      expect(mocks.revokeUrl).toHaveBeenCalledWith("blob:copper-image"),
    );
    await screen.findByAltText("second.png");
    unmount();
    expect(mocks.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it("shows a safe error without creating an object URL", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Image signature mismatch"));
    render(<ImageViewer vaultId="demo" path="assets/fake.png" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Image signature mismatch",
    );
    expect(mocks.createUrl).not.toHaveBeenCalled();
  });
});
