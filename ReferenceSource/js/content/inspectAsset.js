// Pure file checks shared by the local inspector and Node regression tests.
export const MAX_PREVIEW_BYTES = 32 * 1024 * 1024;
export function inspectAsset(buffer) {
  const bytes = new Uint8Array(buffer);
  if (!bytes.length || bytes.length > MAX_PREVIEW_BYTES) throw new Error('Empty file or preview exceeds the 32 MiB limit.');
  const text = new TextDecoder().decode(bytes.subarray(0, 160));
  if (text.startsWith('version https://git-lfs.github.com/spec/v1')) throw new Error('Missing Git LFS payload: this file is a pointer, not an asset.');
  const view = new DataView(buffer);
  const ascii = (start, end) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === 'glTF') {
    if (bytes.length < 20 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) throw new Error('Invalid GLB version or declared length.');
    let offset = 12, json = null, binaryBytes = 0, chunks = 0;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) throw new Error('Truncated GLB chunk header.');
      const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
      offset += 8;
      if (length % 4 || offset + length > bytes.length) throw new Error('Invalid GLB chunk length.');
      if (chunks === 0 && type !== 0x4e4f534a) throw new Error('GLB must begin with JSON.');
      if (type === 0x4e4f534a) {
        if (json) throw new Error('Duplicate GLB JSON chunk.');
        json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + length)).trim());
      } else if (type === 0x004e4942) binaryBytes += length;
      offset += length; chunks++;
    }
    if (json?.asset?.version !== '2.0') throw new Error('Unsupported glTF asset version.');
    if ((json.buffers || []).some(b => b.uri) || (json.images || []).some(i => i.uri)) throw new Error('External or URI-based resources need conversion to a self-contained GLB before preview.');
    if ((json.buffers || []).length > 1 || (json.buffers?.[0]?.byteLength || 0) > binaryBytes) throw new Error('GLB binary payload is incomplete.');
    for (const b of json.bufferViews || []) {
      if ((b.buffer || 0) !== 0 || !Number.isSafeInteger(b.byteLength) || b.byteLength < 0 || !Number.isSafeInteger(b.byteOffset || 0) || (b.byteOffset || 0) < 0 || (b.byteOffset || 0) + b.byteLength > (json.buffers?.[0]?.byteLength || 0)) throw new Error('GLB buffer view is outside its binary payload.');
    }
    return {kind: 'glb', json, nodes: json.nodes?.length || 0, meshes: json.meshes?.length || 0, animations: json.animations?.length || 0, images: json.images?.length || 0, binaryBytes};
  }
  if (bytes.length >= 24 && ascii(1, 4) === 'PNG' && bytes[0] === 137 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 && ascii(12, 16) === 'IHDR') return {kind:'image', mime:'image/png'};
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return {kind:'image', mime:'image/jpeg'};
  if (bytes.length >= 16 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' && view.getUint32(4, true) + 8 === bytes.length) return {kind:'image', mime:'image/webp'};
  throw new Error('Unsupported file signature. Preview supports embedded GLB v2, JPEG, PNG and WebP only.');
}

export async function fetchAsset(entry, {signal, fetcher = fetch} = {}) {
  if (!entry.previewUrl || entry.availability !== 'available') throw new Error('This reference is unavailable for preview.');
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > MAX_PREVIEW_BYTES) throw new Error('Asset exceeds the bounded preview budget.');
  const url = new URL(entry.previewUrl, globalThis.location?.href || 'http://localhost/');
  const origin = globalThis.location?.origin || 'http://localhost';
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('Only same-origin local catalog assets can be previewed.');
  const response = await fetcher(url.href, {signal, redirect:'error'});
  if (!response.ok) throw new Error(`Asset unavailable (HTTP ${response.status}). Keep using the standard game assets.`);
  const reader = response.body.getReader();
  const parts = []; let total = 0;
  try {
    while (true) {
      const {value, done} = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > entry.bytes || total > MAX_PREVIEW_BYTES) throw new Error('Download exceeds the catalog byte count.');
      parts.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (total !== entry.bytes) throw new Error('Incomplete asset: byte count differs from catalog.');
  const bytes = new Uint8Array(total); let offset = 0;
  for (const part of parts) {bytes.set(part, offset); offset += part.byteLength;}
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== entry.sha256.toLowerCase()) throw new Error('Asset checksum differs from reviewed source. Re-audit before previewing.');
  return {buffer:bytes.buffer, inspection:inspectAsset(bytes.buffer)};
}
