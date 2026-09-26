import { copper } from "@/lib/copper";

export async function loadVaultImage(
  vaultId: string,
  path: string,
): Promise<{ url: string; mimeType: string }> {
  const [metadata, bytes] = await Promise.all([
    copper.files.binaryMetadata(vaultId, path),
    copper.files.readBinary(vaultId, path),
  ]);
  const copied = new Uint8Array(bytes).buffer;
  return {
    url: URL.createObjectURL(new Blob([copied], { type: metadata.mimeType })),
    mimeType: metadata.mimeType,
  };
}
