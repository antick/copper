import { Facet } from "@codemirror/state";
import { type EditorView, WidgetType } from "@codemirror/view";
import { safeExternalUrl } from "@/lib/safe-url";

export const localImageLoader = Facet.define<
  (path: string) => Promise<string>,
  ((path: string) => Promise<string>) | undefined
>({
  combine: (values) => values[0],
});

export class ImageWidget extends WidgetType {
  private readonly cleanup = new WeakMap<HTMLElement, () => void>();
  constructor(
    private readonly url: string,
    private readonly alt = "",
  ) {
    super();
  }
  eq(other: ImageWidget) {
    return this.url === other.url && this.alt === other.alt;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement("span");
    const external = safeExternalUrl(this.url);
    const show = (url: string) => {
      const image = document.createElement("img");
      image.className = "cm-copper-image";
      image.alt = this.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.src = url;
      container.replaceChildren(image);
    };
    if (external?.startsWith("https:")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copper-inline-image-load";
      const host = new URL(external).host;
      button.textContent = `Load image from ${host}`;
      button.title = "Loading shares your network address with this server";
      button.setAttribute(
        "aria-label",
        `${button.textContent}. Loading shares your network address with this server.`,
      );
      button.addEventListener("click", () => show(external), { once: true });
      container.append(button);
    } else if (!external && !/^(?:[a-z][a-z\d+.-]*:|[\\/#])/i.test(this.url)) {
      const load = view.state.facet(localImageLoader);
      if (!load) {
        container.textContent = "Image unavailable";
        return container;
      }
      let disposed = false;
      let objectUrl: string | undefined;
      container.textContent = "Loading image…";
      this.cleanup.set(container, () => {
        disposed = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      });
      void Promise.resolve()
        .then(() => load(decodeURIComponent(this.url)))
        .then((url) => {
          if (disposed) {
            URL.revokeObjectURL(url);
            return;
          }
          objectUrl = url;
          show(url);
        })
        .catch(() => {
          if (!disposed) container.textContent = "Image unavailable";
        });
    } else {
      container.textContent = "Image blocked: unsupported address";
    }
    return container;
  }
  destroy(dom: HTMLElement): void {
    this.cleanup.get(dom)?.();
  }
  ignoreEvent(): boolean {
    return true;
  }
}
