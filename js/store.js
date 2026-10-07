// App state, saved on the phone (localStorage). Photos live separately in IndexedDB (photos.js).
import { EQUIP } from './training.js';
import { clone, deepMerge } from './util.js';

const KEY = 'farouk-coach-v1';
export const VERSION = 1;

export const DEFAULTS = {
  version: VERSION,
  profile: {
    name: 'Farouk', age: 26, heightCm: 187, startDate: '2026-10-11',
    kcal: 2200, protein: 150, budget: 700, goalWeight: 76.9,
    dislikes: 'Very spicy food (medium is fine)',
    homeDays: [0, 1, 2, 3, 4],      // Sun–Thu at home; Fri–Sat in Makkah
    awayMeals: ['4:dinner'],          // Thursday dinner: football in Makkah
    cookDays: [0, 2],                 // cook Sunday and Tuesday evenings
    shopDay: 6,                       // shop Saturday, every 2 weeks
    cookMode: 'one'                   // one dish per cook session (+ no-cook dinners) or 'two'
  },
  equipment: Object.fromEntries(EQUIP.map(e => [e[0], true])),
  prices: {},
  inbody: [{
    date: '2026-10-07', weight: 86.6, pbf: 24.5, smm: 37.1, bfm: 21.2, visceral: 8, whr: 0.90, score: 70, tbw: 47.7,
    segMuscle: { armR: 91.5, armL: 90.3, trunk: 92.2, legR: 106.2, legL: 105.6 },
    segFat: { armR: 185.9, armL: 189.8, trunk: 226.0, legR: 162.8, legL: 162.0 }
  }],
  baseline: { waist: null, date: null, neck: '' },
  daily: {},          // date -> {weight, steps, sleep, food, creatine, posture, water, acts:[{t,min}], offplan:[{n,kcal}]}
  logs: {},           // date -> sid -> session record
  checkins: [], tests: [], pausedWeeks: [],
  kcalHistory: [{ date: '2026-10-07', kcal: 2200, reason: 'Starting target from the first InBody' }],
  meal: { cycles: [] },
  customRecipes: [], customFoods: {},
  prep: { inbody: true },
  lastBackup: null
};

export const app = { S: clone(DEFAULTS), saveTimer: null, onSaveError: null };

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) app.S = migrate(deepMerge(clone(DEFAULTS), JSON.parse(raw)));
  } catch (e) { console.warn('load failed', e); }
  try { navigator.storage?.persist?.(); } catch (e) { /* not supported */ }
  return app.S;
}
function migrate(S) { S.version = VERSION; return S; }
export function save() {
  clearTimeout(app.saveTimer);
  app.saveTimer = setTimeout(flush, 400);
}
export function flush() {
  clearTimeout(app.saveTimer); app.saveTimer = null;
  try { localStorage.setItem(KEY, JSON.stringify(app.S)); }
  catch (e) { console.warn('save failed', e); app.onSaveError?.(e); }
}
export function replaceState(obj) {
  if (!obj || typeof obj !== 'object' || !obj.profile || !obj.logs) throw new Error('That file isn\'t a Farouk\'s Coach backup.');
  app.S = migrate(deepMerge(clone(DEFAULTS), obj));
  flush();
}
export function resetLogs() {
  const S = app.S;
  Object.assign(S, { daily: {}, logs: {}, checkins: [], tests: [], pausedWeeks: [], inbody: clone(DEFAULTS.inbody), kcalHistory: clone(DEFAULTS.kcalHistory), meal: { cycles: [] }, baseline: clone(DEFAULTS.baseline), prep: clone(DEFAULTS.prep) });
  S.profile.kcal = DEFAULTS.profile.kcal;
  flush();
}
