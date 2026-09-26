import { commandDefinitions, shortcutLabel } from "@/app/commands/registry";

export function HotkeysSettings({ platform }: { platform?: string }) {
  return (
    <table className="copper-hotkey-table">
      <thead>
        <tr>
          <th>Command</th>
          <th>Shortcut</th>
        </tr>
      </thead>
      <tbody>
        {commandDefinitions.map((command) => (
          <tr key={command.id}>
            <td>{command.label}</td>
            <td>{shortcutLabel(command, platform)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
