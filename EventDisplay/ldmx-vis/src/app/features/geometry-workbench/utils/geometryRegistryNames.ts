export function normalizeGeometryName(name: string) {
  return normalizeRawGeometryName(name).replace(/#\d+$/g, '');
}

export function normalizeRawGeometryName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim();
}

export function formatVolumeLabel(name: string) {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\bphysvol\b/g, '')
    .replace(/\bvol\b/g, '')
    .replace(/\bpv\b/g, '')
    .replace(/\bimpr\b/g, '')
    .replace(/\bassembly\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatIndexedVolume(prefix: string, normalized: string) {
  const index = extractTrailingIndex(normalized);
  return index == null ? prefix : `${prefix} ${index + 1}`;
}

export function describeTrackerLayer(prefix: string, normalized: string) {
  const index = extractTrailingIndex(normalized);
  return index == null ? prefix : `${prefix} ${index / 10}`;
}

export function extractTrailingIndex(normalized: string) {
  const match = normalized.match(/_(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}
