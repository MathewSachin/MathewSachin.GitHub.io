export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  accent_color?: string
  quick_tool?: boolean
}

export const TOOLS: Tool[] = [
  {
    id: 'captura',
    name: 'Captura Web Recorder',
    description:
      'Record your screen with webcam overlay and microphone audio — streams directly to disk. Runs entirely in your browser, no data sent to any server.',
    icon: 'fas fa-video',
    quick_tool: true,
  },
  {
    id: 'pdf',
    name: 'PDF Password Tool',
    description:
      'Add or remove passwords from PDF files entirely in your browser — powered by QPDF WebAssembly. Your files never leave your device.',
    icon: 'fas fa-file-pdf',
    quick_tool: true,
  },
  {
    id: 'bookmarklet',
    name: 'Bookmarklet Compiler',
    description:
      'Minify and compile raw JavaScript into a drag-and-drop bookmarklet — strips comments, compresses whitespace, and URI-encodes for the browser.',
    icon: 'fas fa-bookmark',
    quick_tool: true,
  },
  {
    id: 'yt-thumbnail',
    name: 'YouTube Thumbnail Grabber',
    description:
      'Instantly fetch the full-resolution thumbnail of any YouTube video — paste any YouTube URL or video ID and download the raw JPG.',
    icon: 'fab fa-youtube',
    accent_color: '#CC0000',
    quick_tool: true,
  },
  {
    id: 'imgcompress',
    name: 'Image Compressor',
    description:
      'Compress and convert images to JPEG, PNG, or WebP entirely in your browser — powered by ImageMagick WebAssembly.',
    icon: 'fas fa-image',
    quick_tool: true,
  },
  {
    id: 'mediaconvert',
    name: 'Video & Audio Converter',
    description:
      'Convert video and audio files between MP4, WebM, MKV, MOV, MP3, WAV, OGG, FLAC and more — runs entirely in your browser using the WebCodecs API. No uploads, no server.',
    icon: 'fas fa-film',
    quick_tool: true,
  },
  { id: 'timestamp', name: 'Timestamp Converter', description: 'Convert between Unix epoch and human-readable timestamps.', icon: 'fas fa-clock' },
  { id: 'base64', name: 'Base64 Encoder / Decoder', description: 'Encode plain text to Base64 or decode Base64 back to text.', icon: 'fas fa-code' },
  { id: 'json', name: 'JSON Formatter & Validator', description: 'Format, minify, and validate JSON documents.', icon: 'fas fa-file-code' },
  { id: 'cron', name: 'CRON Expression Generator', description: 'Build CRON expressions from frequency dropdowns — minute, hour, day, week, or month.', icon: 'fas fa-calendar-days' },
  { id: 'hash', name: 'Hash Generator', description: 'Generate MD5, SHA-1, and SHA-256 hashes from any input text.', icon: 'fas fa-hashtag' },
  { id: 'scratchpad', name: 'Smart Scratchpad', description: 'Distraction-free notepad that auto-saves every keystroke. Instantly strips formatting from pasted text.', icon: 'fas fa-pencil' },
]
