export function toImageUri(photo?: string | null): string | undefined {
  if (!photo) {
    return undefined;
  }

  if (photo.startsWith('data:')) {
    return photo;
  }

  return `data:image/jpeg;base64,${photo}`;
}
