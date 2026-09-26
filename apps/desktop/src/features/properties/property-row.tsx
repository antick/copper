import { pillTone } from "@/lib/pills";

export function PropertyRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const key = name.toLowerCase();

  if (key === "type" || key === "status") {
    const text = String(value ?? "");
    const tone = pillTone(text);
    return (
      <div className="copper-property-row">
        <dt>{label}</dt>
        <dd>
          <span
            className="copper-pill"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {key === "status" ? <span className="copper-pill-dot" /> : null}
            <input
              defaultValue={text}
              onBlur={(event) => onChange(event.target.value)}
              style={{ color: "inherit", font: "inherit" }}
            />
          </span>
        </dd>
      </div>
    );
  }

  if (key === "date") {
    return (
      <div className="copper-property-row">
        <dt>{label}</dt>
        <dd>
          <input
            type="date"
            defaultValue={dateInputValue(value)}
            onBlur={(event) => onChange(event.target.value)}
            aria-label="Date"
          />
        </dd>
      </div>
    );
  }

  if (Array.isArray(value) || key === "tags") {
    const items = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="copper-property-row">
        <dt>{label}</dt>
        <dd>
          <div className="copper-note-meta">
            {items.map((tag) => {
              const tone = pillTone(tag);
              return (
                <span
                  key={tag}
                  className="copper-chip"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
          <input
            className="copper-tag-editor"
            defaultValue={items.join(", ")}
            aria-label="Edit tags"
            onBlur={(event) =>
              onChange(
                event.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              )
            }
          />
        </dd>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="copper-property-row">
        <dt>{label}</dt>
        <dd>
          <input
            type="checkbox"
            checked={value}
            onChange={(event) => onChange(event.target.checked)}
          />
        </dd>
      </div>
    );
  }

  return (
    <div className="copper-property-row">
      <dt>{label}</dt>
      <dd>
        <input
          defaultValue={value == null ? "" : String(value)}
          onBlur={(event) => {
            const next = event.target.value;
            if (typeof value === "number") {
              const parsed = Number(next);
              onChange(Number.isFinite(parsed) ? parsed : next);
              return;
            }
            onChange(next);
          }}
        />
      </dd>
    </div>
  );
}

function dateInputValue(value: unknown) {
  const text = String(value ?? "");
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}
