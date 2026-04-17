// Unicode-safe Base64 encoding via TextEncoder
export function encodeBase64(str) {
  var bytes = new TextEncoder().encode(str);
  var binary = Array.from(bytes, function (b) { return String.fromCharCode(b); }).join('');
  return btoa(binary);
}

// Unicode-safe Base64 decoding via TextDecoder
export function decodeBase64(b64) {
  var binary = atob(b64);
  var bytes = Uint8Array.from(binary, function (c) { return c.charCodeAt(0); });
  return new TextDecoder().decode(bytes);
}
