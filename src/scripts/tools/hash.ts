// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: No types for spark-md5 available in this project
import SparkMD5 from 'spark-md5';

export function md5(str: string): string {
  return SparkMD5.hash(str || '');
}

export function hexFromBuffer(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha(algo: string, text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, enc);
  return hexFromBuffer(buf);
}
