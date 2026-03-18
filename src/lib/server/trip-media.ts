export function isExternalAssetUrl(value: string) {
  return /^https?:\/\//.test(value);
}

export async function resolveStoredAssetUrl(
  value: string,
  signPhotoUrl: (storageKey: string) => Promise<string>
) {
  if (!value) {
    return "";
  }

  if (isExternalAssetUrl(value)) {
    return value;
  }

  return signPhotoUrl(value);
}
