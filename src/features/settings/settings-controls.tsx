import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
} from "react";

export function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="copper-settings-page">
      <header className="copper-settings-page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="copper-settings-section">
      <div className="copper-settings-section-heading">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="copper-settings-section-card">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="copper-settings-row">
      <div className="copper-settings-row-copy">
        <div className="copper-settings-row-label">{label}</div>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="copper-settings-row-control">{control}</div>
    </div>
  );
}

export function SettingsSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="copper-settings-select" {...props} />;
}

export function SettingsNumberField(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      type="number"
      className="copper-settings-number"
      inputMode="decimal"
      {...props}
    />
  );
}

export function SettingsTextField(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  return <input type="text" className="copper-settings-text" {...props} />;
}

export function SettingsButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="copper-settings-action" {...props} />;
}

export function SettingsSwitch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="copper-settings-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span aria-hidden="true" />
    </label>
  );
}

export function SettingsStatus({
  children,
  id,
  tone = "default",
}: {
  children: ReactNode;
  id?: string;
  tone?: "default" | "error";
}) {
  return (
    <p
      id={id}
      className="copper-settings-status"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
