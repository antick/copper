import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import "./settings-dialog.css";

export function SettingsDialog({
  title,
  description,
  open,
  onOpenChange,
  onReturnFocus,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnFocus?: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Commit numeric fields before Escape or outside-click unmounts them.
        if (!next && document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="copper-search-overlay" />
        <Dialog.Content
          className="copper-settings-dialog"
          onCloseAutoFocus={(event) => {
            if (onReturnFocus) {
              event.preventDefault();
              onReturnFocus();
            }
          }}
        >
          <header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Close">
                <X size={16} aria-hidden />
              </IconButton>
            </Dialog.Close>
          </header>
          <Dialog.Description>{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
