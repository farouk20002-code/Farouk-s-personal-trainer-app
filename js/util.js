// Small helpers shared by every module. No DOM access here, so tests can import it.
export const pad = n => String(n).padStart(2, '0');
export const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const pkey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = pkey(k); d.setDate(d.getDate() + n); return dkey(d); };
export const diffDays = (a, b) => Math.round((pkey(b) - pkey(a)) / 864e5);
export const todayKey = () => dkey(new Date());
export const dow = k => pkey(k).getDay();
export const fmtDate = k => pkey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtShort = k => pkey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
export const r1 = n => Math.round(n * 10) / 10;
export const clone = o => JSON.parse(JSON.stringify(o));
export const sum = a => a.reduce((x, y) => x + y, 0);
export const avg = a => a.length ? sum(a) / a.length : null;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Deterministic RNG so a generated meal plan stays the same every time it is rebuilt.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffle(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function deepMerge(base, over) {
  if (!over || typeof over !== 'object') return base;
  for (const k of Object.keys(over)) {
    const v = over[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}

// Minimal markdown: bold, bullet and numbered lists, headings as bold lines.
export function md(t) {
  const lines = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').split('\n');
  let out = '', list = null;
  const close = () => { if (list) { out += '</' + list + '>'; list = null; } };
  for (const raw of lines) {
    const l = raw.trim(); let m;
    if ((m = l.match(/^[-•*]\s+(.*)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += '<li>' + m[1] + '</li>'; continue; }
    if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += '<li>' + m[1] + '</li>'; continue; }
    close();
    if (!l) continue;
    if ((m = l.match(/^#{1,4}\s+(.*)/))) { out += '<p><strong>' + m[1] + '</strong></p>'; continue; }
    out += '<p>' + l + '</p>';
  }
  close(); return out;
}
