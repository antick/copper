import { type ComponentProps, useId } from "react";
import "./text-area-field.css";

export function TextAreaField({
  label,
  hint,
  id,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  return (
    <div className="copper-text-area-field">
      <label htmlFor={fieldId}>{label}</label>
      <textarea
        {...props}
        id={fieldId}
        aria-describedby={
          [props["aria-describedby"], hint ? hintId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {hint ? <p id={hintId}>{hint}</p> : null}
    </div>
  );
}
