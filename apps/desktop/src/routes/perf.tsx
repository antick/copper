import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  FIXTURE_SIZES,
  generateMarkdown,
} from "@/features/editor/perf/generate-markdown";
import { PerfEditor } from "@/features/editor/perf/perf-editor";

export const Route = createFileRoute("/perf")({
  component: PerfPage,
});

const FIXTURES = [
  { id: "small", label: "10 KB", bytes: FIXTURE_SIZES.small },
  { id: "normal", label: "100 KB", bytes: FIXTURE_SIZES.normal },
  { id: "large", label: "1 MB", bytes: FIXTURE_SIZES.large },
  { id: "huge", label: "5 MB", bytes: FIXTURE_SIZES.huge },
  { id: "abusive", label: "25 MB", bytes: FIXTURE_SIZES.abusive },
] as const;

function PerfPage() {
  const [fixtureId, setFixtureId] =
    useState<(typeof FIXTURES)[number]["id"]>("small");
  const selected =
    FIXTURES.find((fixture) => fixture.id === fixtureId) ?? FIXTURES[0];
  const docQuery = useQuery({
    queryKey: ["perf-fixture", selected.id],
    queryFn: () => generateMarkdown(selected.bytes),
    staleTime: Infinity,
  });

  const onReady = useCallback(() => undefined, []);
  const editor = useMemo(() => {
    if (!docQuery.data) {
      return <p>Generating {selected.label} fixture…</p>;
    }
    return <PerfEditor doc={docQuery.data} onReady={onReady} />;
  }, [docQuery.data, onReady, selected.label]);

  return (
    <div className="perf-page">
      <header className="perf-toolbar">
        <strong>Copper editor performance proof</strong>
        {FIXTURES.map((fixture) => (
          <button
            key={fixture.id}
            type="button"
            data-active={fixture.id === fixtureId}
            onClick={() => setFixtureId(fixture.id)}
          >
            {fixture.label}
          </button>
        ))}
      </header>
      {editor}
    </div>
  );
}
