// UI state shared by the views, plus tiny shared components.
import { esc, todayKey } from './util.js';

export const ui = {
  route: { tab: 'today' },
  logDate: null,          // date being edited in the daily log (null = today)
  planWeek: null, openSwap: null, ciResult: null, foodTab: 'plan', foodDay: null,
  copied: null, importMsg: null, photos: null, ask: '', recipeAsk: ''
};
export const today = () => todayKey();

let renderFn = () => {};
export const setRender = f => { renderFn = f; };
export const render = (keepScroll = true) => renderFn(keepScroll);

export function toast(t) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = t; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}
// Full-screen celebration (records, level-ups, badges, finished sessions). Queued, tap to dismiss.
const queue = [];
export function celebrate(c) {
  if (c) queue.push(c);
  const el = document.getElementById('celebrate'); if (!el || el.classList.contains('show') || !queue.length) return;
  const x = queue.shift();
  el.innerHTML = `<div class="cel ${x.big ? 'big' : ''}">${x.big ? '<div class="confetti">' + Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join('') + '</div>' : ''}<div class="kicker">${esc(x.kicker || '')}</div><h2>${esc(x.title || '')}</h2>${x.sub ? `<p>${esc(x.sub)}</p>` : ''}${x.xp ? `<div class="xpgain">+${x.xp} XP</div>` : ''}<span class="small muted">Tap to continue</span></div>`;
  el.classList.add('show');
  try { navigator.vibrate?.(x.big ? [60, 40, 120] : 40); } catch (e) { /* ignore */ }
}
celebrate.next = () => { const el = document.getElementById('celebrate'); el.classList.remove('show'); setTimeout(() => celebrate(), 120); };

export function go(route) {
  ui.route = route; ui.openSwap = null;
  try { history.pushState({ route }, ''); } catch (e) { /* ignore */ }
  render(false);
}

// Components
export const seg = (act, field, value, opts, extra = '') => `<div class="seg">${opts.map(([v, l]) => `<button data-act="${act}" data-f="${field}" data-v="${esc(v)}" ${extra} class="${String(value) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
export const check = (act, on, label, data = '') => `<button class="check ${on ? 'on' : ''}" data-act="${act}" ${data}><span class="box">${on ? '✓' : ''}</span><span>${label}</span></button>`;
export const stat = (l, v) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`;
export const icon = {
  back: '←',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
};

// In-app confirm: first tap arms the button for 4 s, second tap runs it.
export function armed(btn, label) {
  if (btn.dataset.armed === '1') { btn.dataset.armed = ''; return true; }
  const old = btn.textContent; btn.dataset.armed = '1'; btn.textContent = label; btn.classList.add('danger');
  setTimeout(() => { if (btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = old; btn.classList.remove('danger'); } }, 4000);
  return false;
}

// Copy text to the clipboard. Must be called straight from a tap.
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}
// Save or share a file (backup, calendar).
export async function saveFile(name, text, type) {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (type !== 'text/calendar' && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
  } catch (e) { if (e?.name === 'AbortError') return false; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return true;
}
