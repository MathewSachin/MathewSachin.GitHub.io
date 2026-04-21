// Use spark-md5 from npm for MD5 hashing (handles UTF-8 correctly)
import SparkMD5 from 'spark-md5';

export function md5(str) {
  return SparkMD5.hash(str || '');
}

// ── SHA via Web Crypto API ────────────────────────────────────────────────

export function hexFromBuffer(buf) {
  return Array.from(new Uint8Array(buf))
    .map(function (b) { return b.toString(16).padStart(2, '0'); })
    .join('');
}

export async function sha(algo, text) {
  var enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, enc);
  return hexFromBuffer(buf);
}
