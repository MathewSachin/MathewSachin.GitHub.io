import QRCode from 'qrcode';

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrOptions {
  size?: number;
  errorCorrectionLevel?: QrErrorCorrectionLevel;
}

const DEFAULT_SIZE = 256;
const MAX_FILENAME_LENGTH = 40;

export async function generateQrDataUrl(input: string, options: QrOptions = {}): Promise<string> {
  const text = input.trim();
  if (!text) {
    throw new Error('Please enter text or a URL to generate a QR code.');
  }

  const size = Number.isFinite(options.size) ? Math.max(64, Math.floor(options.size!)) : DEFAULT_SIZE;
  const errorCorrectionLevel = options.errorCorrectionLevel ?? 'M';

  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel,
  });
}

export function qrDownloadFilename(input: string): string {
  const text = input.trim().toLowerCase();
  if (!text) {
    return 'qr-code.png';
  }

  const slug = text
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_FILENAME_LENGTH);

  return slug ? `qr-${slug}.png` : 'qr-code.png';
}
