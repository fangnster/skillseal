// Shared by the browser and server. No Node imports or executable package contents.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export function safePath(name: string) {
  if (
    !name ||
    name.length > 240 ||
    name.includes('\\') ||
    /[\x00-\x1f:]/.test(name) ||
    name.startsWith('/') ||
    name
      .split('/')
      .some(
        (s) =>
          !s ||
          s === '.' ||
          s === '..' ||
          /[. ]$/.test(s) ||
          /[<>|?*]/.test(s) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s),
      )
  )
    throw new Error('Unsafe portable bundle path');
  return name;
}
export type Bundle = { format: 'skill-vault-files-v1'; files: { path: string; data: string }[] };
export function validatePaths(files: Bundle['files']) {
  if (!files.length || files.length > 500) throw new Error('Choose between 1 and 500 files');
  const seen = new Set<string>();
  for (const f of files) {
    safePath(f.path);
    const n = f.path.normalize('NFC').toLowerCase();
    if (seen.has(n)) throw new Error('Duplicate bundle path');
    seen.add(n);
  }
  for (const n of seen)
    for (const other of seen)
      if (n !== other && other.startsWith(n + '/')) throw new Error('File/directory collision');
  if (!files.some((f) => f.path === 'SKILL.md'))
    throw new Error('A nonempty SKILL.md is required at the bundle root');
}
