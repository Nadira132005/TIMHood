type AvatarPhotoInput = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoBase64?: string;
  showPhotoToOthers?: boolean;
  canSeePrivatePhoto?: boolean;
  fallbackLabel?: string;
};

const AVATAR_BACKGROUNDS = ['#0F766E', '#1D4ED8', '#6D28D9', '#BE185D', '#166534', '#C2410C', '#0F172A', '#7C2D12'];

function hashValue(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getAvatarLabel(input: Pick<AvatarPhotoInput, 'fullName' | 'firstName' | 'lastName' | 'fallbackLabel'>): string {
  const fullName = input.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const combinedName = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(' ').trim();
  if (combinedName) {
    return combinedName;
  }

  return input.fallbackLabel?.trim() || 'User';
}

export function getInitials(label: string): string {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'U';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function buildInitialsAvatar(label: string): string {
  const normalizedLabel = label.trim() || 'User';
  const initials = getInitials(normalizedLabel);
  const background = AVATAR_BACKGROUNDS[hashValue(normalizedLabel) % AVATAR_BACKGROUNDS.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#g)" />
      <circle cx="120" cy="120" r="82" fill="rgba(255,255,255,0.12)" />
      <text x="120" y="145" text-anchor="middle" font-family="Arial" font-size="84" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function isGeneratedAvatarDataUri(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith('data:image/svg+xml');
}

export function ensureStoredProfilePhoto(input: AvatarPhotoInput): string {
  const existingPhoto = input.profilePhotoBase64?.trim();
  if (existingPhoto) {
    return existingPhoto;
  }

  return buildInitialsAvatar(getAvatarLabel(input));
}

export function resolveVisibleProfilePhoto(input: AvatarPhotoInput): string {
  if (input.canSeePrivatePhoto) {
    return ensureStoredProfilePhoto(input);
  }

  if (input.showPhotoToOthers === false) {
    return buildInitialsAvatar(getAvatarLabel(input));
  }

  return ensureStoredProfilePhoto(input);
}
