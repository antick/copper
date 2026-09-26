import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  href: string;
  label: string;
  arrow?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
};

export function ActionLink({ href, label, arrow = true, ...props }: Props) {
  return (
    <Button asChild {...props}>
      <a href={href}>
        {label}
        {arrow && <span aria-hidden="true">↗</span>}
      </a>
    </Button>
  );
}
