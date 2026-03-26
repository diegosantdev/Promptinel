import path from 'path';

const SAFE_SEGMENT_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export function assertSafePathSegment(segment, label = 'id') {
  if (typeof segment !== 'string' || segment.length === 0) {
    throw new Error(`Invalid ${label}: must be a non-empty string`);
  }

  if (segment.includes('/') || segment.includes('\\')) {
    throw new Error(`Invalid ${label}: must not contain path separators`);
  }
  if (segment === '.' || segment === '..' || segment.includes('..')) {
    throw new Error(`Invalid ${label}: must not contain '..'`);
  }
  if (path.isAbsolute(segment)) {
    throw new Error(`Invalid ${label}: must not be an absolute path`);
  }
  if (!SAFE_SEGMENT_RE.test(segment)) {
    throw new Error(
      `Invalid ${label}: must match ${SAFE_SEGMENT_RE.toString()} (got ${JSON.stringify(segment)})`
    );
  }

  return segment;
}

export function safeJoin(baseDir, segment, label = 'id') {
  const safe = assertSafePathSegment(segment, label);
  return path.join(baseDir, safe);
}
