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

// Sentinel values for out-of-bounds / invalid VINT reads
const VINT_DEFAULT_VALUE  = 0;
const VINT_DEFAULT_LENGTH = 1;

// EBML element IDs
const ID_SEGMENT      = 0x18538067;
const ID_SEEKHEAD     = 0x114D9B74;
const ID_SEEK         = 0x4DBB;
const ID_SEEKPOSITION = 0x53AC;
const ID_INFO         = 0x1549A966;
const ID_DURATION     = 0x4489;

/**
 * Encode an EBML VINT (variable-size integer) for a *size* field.
 * @param {number} value  Non-negative integer.
 * @returns {Uint8Array}
 */
function encodeVint(value) {
  if (value < 0x7f) {
    return new Uint8Array([value | 0x80]);
  }
  if (value < 0x3fff) {
    return new Uint8Array([0x40 | (value >> 8), value & 0xff]);
  }
  if (value < 0x1fffff) {
    return new Uint8Array([
      0x20 | (value >> 16),
      (value >> 8) & 0xff,
      value & 0xff
    ]);
  }
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
  if (first === 0) return { value: VINT_DEFAULT_VALUE, length: VINT_DEFAULT_LENGTH };

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
 * @param {number} value
 * @returns {Uint8Array} 8 bytes
 */
function encodeFloat64(value) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, false /* big-endian */);
  return new Uint8Array(buf);
}

/**
 * Read a big-endian unsigned integer of `byteCount` bytes.
 * @param {DataView} view
 * @param {number}   offset
 * @param {number}   byteCount
 * @returns {number}
 */
function readUintBE(view, offset, byteCount) {
  let val = 0;
  for (let i = 0; i < byteCount && offset + i < view.byteLength; i++) {
    val = (val * 256) + view.getUint8(offset + i);
  }
  return val;
}

/**
 * Write a big-endian unsigned integer of `byteCount` bytes in-place.
 * @param {Uint8Array} bytes
 * @param {number}     offset
 * @param {number}     byteCount
 * @param {number}     value
 */
function writeUintBE(bytes, offset, byteCount, value) {
  for (let i = byteCount - 1; i >= 0; i--) {
    bytes[offset + i] = value & 0xff;
    value = Math.floor(value / 256);
  }
}

/**
 * Patch (or inject) the WebM Duration element inside the Info block.
 * When Duration is injected (common with Chrome's MediaRecorder), the SeekHead
 * seek positions that reference elements after the injection point are updated
 * so the file remains playable.
 *
 * @param {ArrayBuffer} arrayBuffer  The first ~100 KB of the WebM file.
 * @param {number}      durationMs   Recording duration in milliseconds.
 * @returns {Uint8Array}             Modified header bytes to write back at offset 0.
 */
function patchWebMDuration(arrayBuffer, durationMs) {
  const view  = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const len   = bytes.length;

  // ── 1. Locate Segment element ────────────────────────────────────────────────
  let segmentDataOffset = -1;
  for (let i = 0; i < len - 4; i++) {
    const { id, length: idLen } = readEBMLId(view, i);
    if (id === ID_SEGMENT) {
      const sizeVint = readVint(view, i + idLen);
      segmentDataOffset = i + idLen + sizeVint.length;
      break;
    }
  }
  if (segmentDataOffset === -1) return new Uint8Array(arrayBuffer);

  // ── 2. Locate SeekHead and Info elements ─────────────────────────────────────
  let seekHeadOffset = -1, seekHeadBodyOffset = -1, seekHeadBodySize = -1;
  let infoOffset = -1, infoBodyOffset = -1, infoBodySize = -1;

  let cursor = segmentDataOffset;
  while (cursor < len - 4) {
    const { id, length: idLen } = readEBMLId(view, cursor);
    const sizeVint   = readVint(view, cursor + idLen);
    const bodyOffset = cursor + idLen + sizeVint.length;
    const bodySize   = sizeVint.value;

    if (id === ID_SEEKHEAD && seekHeadOffset === -1) {
      seekHeadOffset     = cursor;
      seekHeadBodyOffset = bodyOffset;
      seekHeadBodySize   = bodySize;
    } else if (id === ID_INFO) {
      infoOffset     = cursor;
      infoBodyOffset = bodyOffset;
      infoBodySize   = bodySize;
      break; // SeekHead always precedes Info; no need to continue
    }

    if (bodySize === 0 || bodyOffset + bodySize > len) break;
    cursor = bodyOffset + bodySize;
  }
  if (infoOffset === -1) return new Uint8Array(arrayBuffer);

  // ── 3. Search for existing Duration inside Info ───────────────────────────────
  let durationOffset = -1, durationBodyOffset = -1, durationBodySize = -1;

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

  // ── 4a. Duration found with 8-byte float slot → overwrite in-place ───────────
  // No size change means no shifts, so SeekHead stays valid.
  if (durationOffset !== -1 && durationBodySize === 8) {
    const result = new Uint8Array(bytes);
    result.set(floatBytes, durationBodyOffset);
    return result;
  }

  // ── 4b. Inject Duration element ───────────────────────────────────────────────
  // Build: 0x44 0x89 (ID, 2 bytes) + VINT(8) (1 byte) + float64 (8 bytes) = 11 bytes
  const durId = new Uint8Array([0x44, 0x89]);
  const durSz = encodeVint(8);
  const durEl = new Uint8Array(durId.length + durSz.length + floatBytes.length);
  durEl.set(durId, 0);
  durEl.set(durSz, durId.length);
  durEl.set(floatBytes, durId.length + durSz.length);

  // Splice point: insert at start of Info body (or replace a 4-byte Duration slot)
  let spliceAt     = infoBodyOffset;
  let removeOldLen = 0;
  if (durationOffset !== -1) {
    spliceAt     = durationOffset;
    removeOldLen = (durationBodyOffset - durationOffset) + durationBodySize;
  }
  const sizeDelta = durEl.length - removeOldLen; // bytes added to the file (typically +11)

  // Build patched buffer
  const patchedLen = bytes.length + sizeDelta;
  const patched    = new Uint8Array(patchedLen);
  patched.set(bytes.subarray(0, spliceAt), 0);
  patched.set(durEl, spliceAt);
  patched.set(bytes.subarray(spliceAt + removeOldLen), spliceAt + durEl.length);

  const patchedView = new DataView(patched.buffer);

  // ── 5. Fix Info element's size VINT ─────────────────────────────────────────
  const infoIdLen         = readEBMLId(view, infoOffset).length;
  const oldInfoSizeOffset = infoOffset + infoIdLen;
  const oldInfoSizeLen    = readVint(view, oldInfoSizeOffset).length;
  const newInfoBodySize   = infoBodySize + sizeDelta;
  const newInfoSizeVint   = encodeVint(newInfoBodySize);

  if (newInfoSizeVint.length === oldInfoSizeLen) {
    patched.set(newInfoSizeVint, oldInfoSizeOffset);
  }
  // If VINT byte-count changed we'd need a second splice — in practice Info always
  // uses a 4-byte VINT (room for growth) so sizes will match.

  // ── 6. Fix SeekHead seek positions that now point past the injection point ────
  // Chrome's MediaRecorder writes a SeekHead before Info with absolute byte offsets
  // (relative to Segment data start) pointing to Tracks, Cues, Cluster, etc.
  // Injecting bytes into Info shifts all those elements; we must update their offsets.
  if (seekHeadOffset !== -1 && sizeDelta > 0) {
    // SeekHead is before Info, so its file position is unchanged in `patched`.
    // Any SeekPosition value >= (spliceAt - segmentDataOffset) must be bumped.
    const injectionRelOffset = spliceAt - segmentDataOffset;

    let skCursor = seekHeadBodyOffset;
    const skEnd  = seekHeadBodyOffset + seekHeadBodySize;

    while (skCursor < skEnd - 2) {
      const { id: skId, length: skIdLen } = readEBMLId(patchedView, skCursor);
      const skSizeVint = readVint(patchedView, skCursor + skIdLen);
      const skBody     = skCursor + skIdLen + skSizeVint.length;
      const skBodySize = skSizeVint.value;

      if (skId === ID_SEEK) {
        let seCursor = skBody;
        const seEnd  = skBody + skBodySize;

        while (seCursor < seEnd - 2) {
          const { id: seId, length: seIdLen } = readEBMLId(patchedView, seCursor);
          const seSizeVint = readVint(patchedView, seCursor + seIdLen);
          const seBody     = seCursor + seIdLen + seSizeVint.length;
          const seBodySize = seSizeVint.value;

          if (seId === ID_SEEKPOSITION && seBodySize >= 1) {
            const pos = readUintBE(patchedView, seBody, seBodySize);
            if (pos >= injectionRelOffset) {
              writeUintBE(patched, seBody, seBodySize, pos + sizeDelta);
            }
          }

          if (seBodySize === 0 || seBody + seBodySize > seEnd) break;
          seCursor = seBody + seBodySize;
        }
      }

      if (skBodySize === 0 || skBody + skBodySize > skEnd) break;
      skCursor = skBody + skBodySize;
    }
  }

  return patched;
}
