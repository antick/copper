import { useEffect, useState } from "react";
import { loadVaultImage } from "@/features/editor/load-vault-image";

interface ImageState {
  url?: string;
  mimeType?: string;
  error?: string;
}

export function ImageViewer({
  vaultId,
  path,
}: {
  vaultId: string;
  path: string;
}) {
  const [state, setState] = useState<ImageState>({});
  const [dimensions, setDimensions] = useState<string>();
  const filename = path.split("/").at(-1) ?? path;

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    setState({});
    setDimensions(undefined);
    void loadVaultImage(vaultId, path)
      .then(({ url, mimeType }) => {
        if (disposed) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setState({ url, mimeType });
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setState({
            error:
              error instanceof Error
                ? error.message
                : "The image could not be opened safely.",
          });
        }
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, vaultId]);

  if (state.error) {
    return (
      <div className="copper-image-state" role="alert">
        <strong>Couldn’t open {filename}</strong>
        <span>{state.error}</span>
      </div>
    );
  }
  if (!state.url) {
    return (
      <div className="copper-image-state" role="status">
        Opening {filename}…
      </div>
    );
  }
  return (
    <figure className="copper-image-viewer">
      <div className="copper-image-stage">
        <img
          src={state.url}
          alt={filename}
          onLoad={(event) => {
            const image = event.currentTarget;
            setDimensions(`${image.naturalWidth} × ${image.naturalHeight}`);
          }}
        />
      </div>
      <figcaption>
        <strong>{filename}</strong>
        <span>{dimensions ?? state.mimeType}</span>
        <span>Read-only</span>
      </figcaption>
    </figure>
  );
}
