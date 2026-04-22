const RESOLUTIONS = [
  { label: 'Max Resolution (1280×720)', key: 'maxresdefault' },
  { label: 'High Quality (480×360)',    key: 'hqdefault' },
  { label: 'Medium Quality (320×180)',  key: 'mqdefault' },
  { label: 'Standard Quality (120×90)', key: 'default' },
];

const VALID_KEYS = new Set(RESOLUTIONS.map(r => r.key));

export function extractVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const m = raw.match(pattern);
    if (m) return m[1];
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  return null;
}

export function thumbnailUrl(videoId: string, key?: string): string {
  const safeKey = VALID_KEYS.has(key || '') ? key! : 'maxresdefault';
  return 'https://img.youtube.com/vi/' + videoId + '/' + safeKey + '.jpg';
}

export function getResolutions() {
  return RESOLUTIONS;
}
