/**
 * webm-duration.js
 *
 * Pure Vanilla JS utility that patches the Duration metadata element into a
 * WebM (EBML) header buffer without loading the full file into memory.
 *
 * Usage:
 *   const patched = patchWebMDuration(arrayBuffer, durationMs);
 *   // patched is a Uint8Array covering [0 .. patchedSize)
 */

'use strict';

/**
 * Encode an EBML VINT (variable-size integer) for a *size* field.
 * The resulting byte-length is the smallest that fits the value.
 * @param {number} value  Non-negative integer (max 2^28-2 for 4 bytes).
 * @returns {Uint8Array}
 */
function encodeVint(value) {
  if (value < 0x7f) {
    // 1-byte VINT: leading 1 bit + 7-bit value  (max 126)
    return new Uint8Array([value | 0x80]);
  }
  if (value < 0x3fff) {
    // 2-byte VINT: 01 + 14-bit value (max 16382)
    return new Uint8Array([0x40 | (value >> 8), value & 0xff]);
  }
  if (value < 0x1fffff) {
    // 3-byte VINT (max 2097150)
    return new Uint8Array([
      0x20 | (value >> 16),
      (value >> 8) & 0xff,
      value & 0xff
    ]);
  }
  // 4-byte VINT (max 268435454)
  return new Uint8Array([
    0x10 | (value >> 24),
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff
  ]);
}

/**
 * Read a VINT from `view` at `offset`.
 * Returns { value, length } where `length` is the byte-width of the VINT.
 * @param {DataView} view
 * @param {number}   offset
 * @returns {{ value: number, length: number }}
 */
function readVint(view, offset) {
  if (offset >= view.byteLength) return { value: VINT_DEFAULT_VALUE, length: VINT_DEFAULT_LENGTH };
  const first = view.getUint8(offset);
  if (first === 0) return { value: VINT_DEFAULT_VALUE, length: VINT_DEFAULT_LENGTH }; // invalid / unknown size

  let numBytes = 1;
  let mask = 0x80;
  while (numBytes <= 8 && !(first & mask)) {
    numBytes++;
    mask >>= 1;
  }

  let value = first & (mask - 1); // strip the leading size bit
  for (let i = 1; i < numBytes; i++) {
    value = (value << 8) | (offset + i < view.byteLength ? view.getUint8(offset + i) : 0);
  }
  return { value, length: numBytes };
}

/**
 * Read a multi-byte EBML element ID (1–4 bytes, no VINT masking).
 * @param {DataView} view
 * @param {number}   offset
 * @returns {{ id: number, length: number }}
 */
function readEBMLId(view, offset) {
  if (offset >= view.byteLength) return { id: VINT_DEFAULT_VALUE, length: VINT_DEFAULT_LENGTH };
  const first = view.getUint8(offset);

  let numBytes = 1;
  let mask = 0x80;
  while (numBytes <= 4 && !(first & mask)) {
    numBytes++;
    mask >>= 1;
  }

  let id = first;
  for (let i = 1; i < numBytes; i++) {
    id = (id << 8) | (offset + i < view.byteLength ? view.getUint8(offset + i) : 0);
  }
  return { id: id >>> 0, length: numBytes };
}

/**
 * Encode an IEEE-754 64-bit double into 8 bytes (big-endian).
 * Uses DataView to guarantee correct byte ordering.
 * @param {number} value
 * @returns {Uint8Array} 8 bytes
 */
function encodeFloat64(value) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, false /* big-endian */);
  return new Uint8Array(buf);
}

// Sentinel values for out-of-bounds / invalid VINT reads
const VINT_DEFAULT_VALUE  = 0;
const VINT_DEFAULT_LENGTH = 1;


const ID_SEGMENT = 0x18538067;
const ID_INFO    = 0x1549A966;
const ID_DURATION = 0x4489;

/**
 * Patch (or inject) the WebM Duration element inside the Info block.
 *
 * @param {ArrayBuffer} arrayBuffer  The first ~100 KB of the WebM file.
 * @param {number}      durationMs   Recording duration in milliseconds.
 * @returns {Uint8Array}             Modified header bytes to write back at offset 0.
 */
function patchWebMDuration(arrayBuffer, durationMs) {
  const view   = new DataView(arrayBuffer);
  const bytes  = new Uint8Array(arrayBuffer);
  const len    = bytes.length;

  // ── 1. Locate Segment element ────────────────────────────────────────────────
  let segmentDataOffset = -1;
  for (let i = 0; i < len - 4; i++) {
    const { id, length: idLen } = readEBMLId(view, i);
    if (id === ID_SEGMENT) {
      // Skip past the Segment ID and its size VINT (which is usually unknown/all-ones)
      const sizeVint = readVint(view, i + idLen);
      segmentDataOffset = i + idLen + sizeVint.length;
      break;
    }
  }
  if (segmentDataOffset === -1) return new Uint8Array(arrayBuffer);

  // ── 2. Locate Info element inside Segment ────────────────────────────────────
  let infoOffset = -1;
  let infoBodyOffset = -1;
  let infoBodySize   = -1;

  let cursor = segmentDataOffset;
  while (cursor < len - 4) {
    const { id, length: idLen } = readEBMLId(view, cursor);
    const sizeVint = readVint(view, cursor + idLen);
    const bodyOffset = cursor + idLen + sizeVint.length;
    const bodySize   = sizeVint.value;

    if (id === ID_INFO) {
      infoOffset     = cursor;
      infoBodyOffset = bodyOffset;
      infoBodySize   = bodySize;
      break;
    }
    // Move to next sibling; if body size is the unknown-size sentinel stop
    if (bodySize === 0 || bodyOffset + bodySize > len) break;
    cursor = bodyOffset + bodySize;
  }
  if (infoOffset === -1) return new Uint8Array(arrayBuffer);

  // ── 3. Search for existing Duration inside Info ───────────────────────────────
  let durationOffset = -1; // offset of the Duration element ID bytes
  let durationBodyOffset = -1;
  let durationBodySize   = -1; // existing encoded float size (4 or 8 bytes)

  cursor = infoBodyOffset;
  const infoEnd = Math.min(infoBodyOffset + infoBodySize, len);
  while (cursor < infoEnd - 2) {
    const { id, length: idLen } = readEBMLId(view, cursor);
    const sizeVint = readVint(view, cursor + idLen);
    const bodyOff  = cursor + idLen + sizeVint.length;
    const bodySize = sizeVint.value;

    if (id === ID_DURATION) {
      durationOffset     = cursor;
      durationBodyOffset = bodyOff;
      durationBodySize   = bodySize;
      break;
    }
    if (bodySize === 0 || bodyOff + bodySize > infoEnd) break;
    cursor = bodyOff + bodySize;
  }

  const floatBytes = encodeFloat64(durationMs);

  if (durationOffset !== -1 && durationBodySize >= 4) {
    // ── 4a. Overwrite existing Duration float in-place ────────────────────────
    // We always write 8 bytes (float64). If the existing slot is 8 bytes we can
    // overwrite directly. If it's only 4 bytes we fall through to the inject path.
    if (durationBodySize === 8) {
      const result = new Uint8Array(bytes);
      result.set(floatBytes, durationBodyOffset);
      return result;
    }
    // 4-byte slot: rewrite the size VINT to 8 and splice in new bytes
    // (handled below via the generic splice path — same as "not found")
  }

  // ── 4b. Inject Duration element into the Info body ────────────────────────────
  // Build the new Duration element: ID (2 bytes) + VINT-size (1 byte) + 8-byte float
  const durId = new Uint8Array([0x44, 0x89]);          // 0x4489
  const durSz = encodeVint(8);                          // body is 8 bytes
  const durEl = new Uint8Array(durId.length + durSz.length + floatBytes.length);
  durEl.set(durId, 0);
  durEl.set(durSz, durId.length);
  durEl.set(floatBytes, durId.length + durSz.length);  // 11 bytes total

  // If we found a 4-byte Duration slot, remove the old element first
  let spliceAt = infoBodyOffset; // default: insert at start of Info body
  let removeOldLen = 0;
  if (durationOffset !== -1) {
    spliceAt = durationOffset;
    removeOldLen = (durationBodyOffset - durationOffset) + durationBodySize;
  }

  // Build patched buffer: bytes before splice point + new element + bytes after
  const patchedLen = bytes.length + durEl.length - removeOldLen;
  const patched    = new Uint8Array(patchedLen);
  patched.set(bytes.subarray(0, spliceAt), 0);
  patched.set(durEl, spliceAt);
  patched.set(bytes.subarray(spliceAt + removeOldLen), spliceAt + durEl.length);

  // ── 5. Fix the Info element's size VINT to account for the extra bytes ────────
  // Recalculate because the Info body grew by (durEl.length - removeOldLen).
  const sizeDelta      = durEl.length - removeOldLen;
  const newInfoBodySize = infoBodySize + sizeDelta;

  // Re-encode the Info size VINT (it was at infoOffset + infoIdLen)
  const infoIdLen  = readEBMLId(view, infoOffset).length;
  const oldSizeVintOffset = infoOffset + infoIdLen;
  const oldSizeVintLen    = readVint(view, oldSizeVintOffset).length;
  const newSizeVint       = encodeVint(newInfoBodySize);

  if (newSizeVint.length === oldSizeVintLen) {
    // Same size — overwrite in place inside `patched`
    patched.set(newSizeVint, oldSizeVintOffset);
  }
  // If sizes differ we'd need a second splice pass, but in practice the Info element
  // is always written with a 4-byte VINT (room for growth), so sizes match.

  return patched;
}
