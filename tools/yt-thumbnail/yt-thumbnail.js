var RESOLUTIONS = [
  { label: 'Max Resolution (1280×720)', key: 'maxresdefault' },
  { label: 'High Quality (480×360)',    key: 'hqdefault' },
  { label: 'Medium Quality (320×180)',  key: 'mqdefault' },
  { label: 'Standard Quality (120×90)', key: 'default' },
];

export function extractVideoId(input) {
  if (!input) return null;
  input = input.trim();

  // Full URL: youtube.com/watch?v=ID or youtu.be/ID or /shorts/ID
  var patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = input.match(patterns[i]);
    if (m) return m[1];
  }

  // Bare 11-character ID
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

  return null;
}

export function thumbnailUrl(videoId, key) {
  return 'https://img.youtube.com/vi/' + videoId + '/' + key + '.jpg';
}

export function getResolutions() {
  return RESOLUTIONS;
}
