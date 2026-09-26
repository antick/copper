import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchResults } from "@/features/search/search-results";

describe("SearchResults", () => {
  it("renders compact rows and opens a result without blocking", async () => {
    const onOpen = vi.fn();
    render(
      <SearchResults
        selectedPath="a.md"
        onOpen={onOpen}
        notes={[
          {
            path: "a.md",
            title: "Copper MVP",
            snippet: "A fast local-first editor",
            tags: ["product"],
            mtimeNs: 0,
          },
        ]}
      />,
    );
    expect(screen.getByText("Copper MVP")).toBeInTheDocument();
    expect(screen.getByText("A fast local-first editor")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Copper MVP"));
    expect(onOpen).toHaveBeenCalledWith("a.md");
  });
});
