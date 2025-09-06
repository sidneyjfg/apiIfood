export function pickQueryString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === 'string' ? first : null;
  }
  return null; // ParsedQs ou outro tipo
}