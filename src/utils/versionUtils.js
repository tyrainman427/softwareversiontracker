export function compareVersions(installed, latest) {
  if (!installed || !latest) return 'Unknown';

  const parse = (v) => {
    const cleaned = String(v).replace(/^v/i, '').trim();
    const parts = cleaned.split('.').map(Number);
    if (parts.some(isNaN)) return null;
    return parts;
  };

  const a = parse(installed);
  const b = parse(latest);
  if (!a || !b) return 'Unknown';

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    if (ai < bi) return 'Outdated';
    if (ai > bi) return 'Up to Date';
  }
  return 'Up to Date';
}
