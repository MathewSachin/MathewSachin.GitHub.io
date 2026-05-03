import type { IconDefinition } from '@fortawesome/fontawesome-common-types';
import {
  faVideo, faFilePdf, faBookmark, faImage, faFilm, faClock, faCode, faFileCode,
  faAtom, faCalendarDays, faHashtag, faPencil,
} from '@fortawesome/free-solid-svg-icons';
import { faYoutube } from '@fortawesome/free-brands-svg-icons';

export interface Tool {
  id: string
  name: string
  description: string
  icon: IconDefinition
  accent_color?: string
  quick_tool?: boolean
}

export const TOOLS: Tool[] = [
  {
    id: 'captura',
    name: 'Captura Web Recorder',
    description:
      'Record your screen with webcam overlay and microphone audio — streams directly to disk. Runs entirely in your browser, no data sent to any server.',
    icon: faVideo,
    quick_tool: true,
  },
  {
    id: 'pdf',
    name: 'PDF Password Tool',
    description:
      'Add or remove passwords from PDF files entirely in your browser — powered by QPDF WebAssembly. Your files never leave your device.',
    icon: faFilePdf,
    quick_tool: true,
  },
  {
    id: 'bookmarklet',
    name: 'Bookmarklet Compiler',
    description:
      'Minify and compile raw JavaScript into a drag-and-drop bookmarklet — strips comments, compresses whitespace, and URI-encodes for the browser.',
    icon: faBookmark,
    quick_tool: true,
  },
  {
    id: 'yt-thumbnail',
    name: 'YouTube Thumbnail Grabber',
    description:
      'Instantly fetch the full-resolution thumbnail of any YouTube video — paste any YouTube URL or video ID and download the raw JPG.',
    icon: faYoutube,
    accent_color: '#CC0000',
    quick_tool: true,
  },
  {
    id: 'imgcompress',
    name: 'Image Compressor',
    description:
      'Compress and convert images to JPEG, PNG, or WebP entirely in your browser — powered by ImageMagick WebAssembly.',
    icon: faImage,
    quick_tool: true,
  },
  {
    id: 'mediaconvert',
    name: 'Video & Audio Converter',
    description:
      'Convert video and audio files between MP4, WebM, MKV, MOV, MP3, WAV, OGG, FLAC and more — runs entirely in your browser using the WebCodecs API. No uploads, no server.',
    icon: faFilm,
    quick_tool: true,
  },
  { id: 'timestamp', name: 'Timestamp Converter', description: 'Convert between Unix epoch and human-readable timestamps.', icon: faClock },
  { id: 'base64', name: 'Base64 Encoder / Decoder', description: 'Encode plain text to Base64 or decode Base64 back to text.', icon: faCode },
  { id: 'json', name: 'JSON Formatter & Validator', description: 'Format, minify, and validate JSON documents.', icon: faFileCode },
  { id: 'ion', name: 'Amazon Ion Formatter', description: 'Format, minify, and convert Amazon Ion documents to JSON — entirely in your browser.', icon: faAtom },
  { id: 'cron', name: 'CRON Expression Generator', description: 'Build CRON expressions from frequency dropdowns — minute, hour, day, week, or month.', icon: faCalendarDays },
  { id: 'hash', name: 'Hash Generator', description: 'Generate MD5, SHA-1, and SHA-256 hashes from any input text.', icon: faHashtag },
  { id: 'scratchpad', name: 'Smart Scratchpad', description: 'Distraction-free notepad that auto-saves every keystroke. Instantly strips formatting from pasted text.', icon: faPencil },
]
