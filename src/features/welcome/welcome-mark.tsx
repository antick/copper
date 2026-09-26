import { APP_ICON_URL } from "@/lib/brand";

export function WelcomeMark() {
  return (
    <img
      className="copper-welcome-mark"
      src={APP_ICON_URL}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
