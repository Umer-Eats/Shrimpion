// Forgiving answer matching for typed answers.

export function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’'`"“”]/g, '')
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9%.\- ]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** True when a typed guess is close enough to the answer. */
export function isCloseEnough(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g) return false;
  if (g === a) return true;
  if (g.replace(/ /g, '') === a.replace(/ /g, '')) return true;
  // numbers must match exactly
  if (/^[\d.% ]+$/.test(a)) return g.replace(/[^\d.]/g, '') === a.replace(/[^\d.]/g, '');
  const allowed = a.length <= 4 ? 0 : a.length <= 8 ? 1 : Math.floor(a.length / 5);
  return levenshtein(g, a) <= allowed;
}
