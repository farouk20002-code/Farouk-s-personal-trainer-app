// iOS-style building blocks: grouped inset sections, list cells, and a small symbol set.
import { esc } from '../util.js';

const svg = (d, fill = false) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  sunrise: svg('<path d="M12 3v4M5.6 8.6l1.4 1.4M18.4 8.6 17 10M3 17h18M7 17a5 5 0 0 1 10 0"/>'),
  box: svg('<path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M3 5h18v3H3zM10 12h4"/>'),
  leaf: svg('<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19 13 11"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
  swap: svg('<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'),
  flame: svg('<path d="M12 21c4 0 7-2.7 7-7 0-4-3-6-4-9-1 2.5-2.5 3.5-4 4 .3-2-.5-4-2-5C9 7 5 9.5 5 14c0 4.3 3 7 7 7z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  egg: svg('<path d="M12 3c-3.5 0-6.5 5-6.5 10a6.5 6.5 0 0 0 13 0C18.5 8 15.5 3 12 3z"/>'),
  check: svg('<path d="M5 12.5 10 17l9-10"/>'),
  checkSm: svg('<path d="M6 12.5 10 16l8-8.5"/>'),
  fork: svg('<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 2.5-3 6s1 4 3 4v8"/>'),
  dumbbell: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>'),
  scale: svg('<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 9a3 3 0 0 1 6 0M12 9l1.5-1.5"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  figure: svg('<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 10h8M12 14l-3 7M12 14l3 7"/>'),
  plate: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  chart: svg('<path d="M3 20h18M6 16l4-5 4 3 5-7"/>')
};
export const chev = (dir = 'right') => `<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;

// A grouped inset section: header, rounded list, optional footnote.
export const sec = (head, rows, foot, trail = '', cls = '') => `<section class="sec ${cls}">${head ? `<div class="sechead"><span>${esc(head)}</span>${trail ? `<span class="trail">${esc(trail)}</span>` : ''}</div>` : ''}<div class="list">${rows}</div>${foot ? `<p class="foot">${esc(foot)}</p>` : ''}</section>`;

// One list cell. `act` is the data attributes for the tap action.
export function cell({ icon, color = 'blue', title, sub, trail = '', act = '', chevron = false, dim = false }) {
  const inner = `${icon ? `<span class="ic ${color}">${icon}</span>` : ''}<span class="cbody"><span class="ct">${esc(title)}</span>${sub ? `<span class="cs">${esc(sub)}</span>` : ''}</span>${trail ? `<span class="ctrail">${trail}</span>` : ''}${chevron ? chev() : ''}`;
  return act ? `<button class="cell tap ${dim ? 'dim' : ''}" ${act}>${inner}</button>` : `<div class="cell ${dim ? 'dim' : ''}">${inner}</div>`;
}
