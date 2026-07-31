const isPlainObject = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const clone = <T>(value: T): T => structuredClone(value);

function arrayIdentity(value: any) {
  if (isPlainObject(value) && typeof value.id === 'string') return `id:${value.id}`;
  if (isPlainObject(value) && typeof value.key === 'string') return `key:${value.key}`;
  return `json:${JSON.stringify(value)}`;
}

/**
 * Add legacy JSON data without replacing records that are already authoritative
 * in PostgreSQL. Objects are merged recursively and arrays are deduplicated by
 * stable record identity. Existing destination values always win.
 */
export function mergeLegacyData<T>(destination: T, source: T): T {
  if (destination === undefined || destination === null) return clone(source);
  if (Array.isArray(destination) && Array.isArray(source)) {
    const result = destination.map(clone);
    const positions = new Map(result.map((item, index) => [arrayIdentity(item), index]));
    for (const item of source) {
      const identity = arrayIdentity(item);
      const existing = positions.get(identity);
      if (existing === undefined) {
        positions.set(identity, result.length);
        result.push(clone(item));
      } else if (isPlainObject(result[existing]) && isPlainObject(item)) {
        result[existing] = mergeLegacyData(result[existing], item);
      }
    }
    return result as T;
  }
  if (isPlainObject(destination) && isPlainObject(source)) {
    const result: Record<string, any> = clone(destination);
    for (const [key, value] of Object.entries(source)) {
      result[key] = key in result ? mergeLegacyData(result[key], value) : clone(value);
    }
    return result as T;
  }
  return clone(destination);
}

export function changedRootKeys(before: Record<string, any>, after: Record<string, any>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
}
