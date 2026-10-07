// Motivation layer: daily rings, streaks, lift records, XP, levels and badges.
// Everything is computed from the logs, so it can never drift out of sync with what you actually did.
import { addDays, diffDays, dow, num, r1 } from './util.js';
import { SESSIONS, dayKind, calWeek, isPaused, doneInWeek, allRecs, exName, e1rm, planWeek } from './training.js';
import { isHome, cycleFor, cookSessions } from './mealplan.js';

export const WEIGH_DAYS = [0, 2, 4]; // Sun, Tue, Thu mornings
export const XP = { ring: 10, fullDay: 25, session: 50, pr: 25, checkin: 40, cook: 30, bigCook: 60, inbody: 50, test: 50 };

/* ---------- Daily rings ---------- */
const started = (S, k) => k >= S.profile.startDate;
export function rings(S, k) {
  const d = S.daily[k] || {}, cw = calWeek(S, k), paused = started(S, k) && isPaused(S, cw), wd = dow(k);
  const out = [];
  if (started(S, k) && !paused && SESSIONS[dayKind(k)]) out.push({ id: 'train', label: 'Train', icon: '🏋️', done: Object.values(S.logs[k] || {}).some(r => r.done) });
  if (isHome(S, k)) out.push({ id: 'food', label: 'Ate to plan', icon: '🍽️', done: d.food === 'yes', half: d.food === 'partly' });
  out.push({ id: 'creatine', label: 'Creatine', icon: '⚡', done: !!d.creatine });
  if (wd >= 0 && wd <= 4) out.push({ id: 'posture', label: 'Posture', icon: '🧍', done: !!d.posture });
  if (WEIGH_DAYS.includes(wd)) out.push({ id: 'weigh', label: 'Weigh-in', icon: '⚖️', done: num(d.weight) != null });
  return out;
}
export const ringsClosed = (S, k) => { const r = rings(S, k); return { done: r.filter(x => x.done).length, total: r.length, all: r.length > 0 && r.every(x => x.done) }; };

/* ---------- Streaks (today still pending never breaks a streak) ---------- */
function dayStreak(S, today, applies, ok, maxBack = 400) {
  let n = 0;
  if (applies(today) && ok(today)) n++;
  for (let i = 1; i < maxBack; i++) {
    const k = addDays(today, -i);
    if (k < S.profile.startDate && !ok(k)) break;
    if (!applies(k)) continue;
    if (ok(k)) n++; else break;
  }
  return n;
}
export function streaks(S, today) {
  const D = k => S.daily[k] || {};
  const pausedDay = k => started(S, k) && isPaused(S, calWeek(S, k));
  const food = dayStreak(S, today, k => isHome(S, k) && !pausedDay(k), k => D(k).food === 'yes');
  const creatine = dayStreak(S, today, () => true, k => !!D(k).creatine);
  const weigh = dayStreak(S, today, k => WEIGH_DAYS.includes(dow(k)), k => num(D(k).weight) != null);
  // Training: consecutive calendar weeks with all 4 sessions. Paused weeks are skipped.
  let weeks = 0;
  const cw = calWeek(S, today);
  if (cw >= 1 && !isPaused(S, cw) && doneInWeek(S, cw).size >= 4) weeks++;
  for (let w = cw - 1; w >= 1; w--) { if (isPaused(S, w)) continue; if (doneInWeek(S, w).size >= 4) weeks++; else break; }
  return { weeks, food, creatine, weigh };
}

/* ---------- Lift records ---------- */
// Best estimated 1RM for an exercise before a date.
function bestBefore(S, id, name, date) {
  let b = null;
  for (const { date: k, rec } of allRecs(S)) {
    if (k >= date) continue;
    const x = rec.ex?.[id]; if (!x || exName(id, x.alt) !== name) continue;
    for (const s of x.sets) { if (!s.done || !num(s.r)) continue; const v = e1rm(num(s.w), num(s.r)); if (b == null || v > b) b = v; }
  }
  return b;
}
// Is this set a new record? (Not on the first time you ever do the exercise.)
export function isRecord(S, id, alt, date, w, r, exceptIndex, sid) {
  const name = exName(id, alt), prev = bestBefore(S, id, name, date);
  if (prev == null || !num(r)) return false;
  const v = e1rm(num(w), num(r));
  let todayBest = null;
  const x = S.logs[date]?.[sid]?.ex?.[id];
  (x?.sets || []).forEach((s, i) => { if (i !== exceptIndex && s.done && num(s.r)) { const t = e1rm(num(s.w), num(s.r)); if (todayBest == null || t > todayBest) todayBest = t; } });
  return v > prev * 1.001 && (todayBest == null || v > todayBest * 1.001);
}
// Count of record-setting sessions per exercise (for XP and badges).
export function recordCount(S) {
  const best = {}; let n = 0;
  const recs = [...allRecs(S)].sort((a, b) => a.date < b.date ? -1 : 1);
  for (const { rec } of recs) for (const [id, x] of Object.entries(rec.ex || {})) {
    const key = id + '|' + exName(id, x.alt);
    let day = null;
    for (const s of x.sets) if (s.done && num(s.r)) { const v = e1rm(num(s.w), num(s.r)); if (day == null || v > day) day = v; }
    if (day == null) continue;
    if (best[key] != null && day > best[key] * 1.001) n++;
    if (best[key] == null || day > best[key]) best[key] = day;
  }
  return n;
}

/* ---------- XP and levels ---------- */
export function xpTotal(S, today) {
  let xp = 0;
  const days = new Set(Object.keys(S.daily).concat(Object.keys(S.logs)));
  for (const k of days) {
    if (k > today) continue;
    const r = ringsClosed(S, k); xp += r.done * XP.ring + (r.all ? XP.fullDay : 0);
    if (S.daily[k]?.cooked) xp += S.daily[k].cookedBig ? XP.bigCook : XP.cook;
  }
  for (const { rec } of allRecs(S)) if (rec.done) xp += XP.session;
  xp += recordCount(S) * XP.pr;
  xp += S.checkins.length * XP.checkin + Math.max(0, S.inbody.length - 1) * XP.inbody + S.tests.length * XP.test;
  return xp;
}
const NAMES = ['Rookie', 'Starter', 'Regular', 'Grinder', 'Athlete', 'Competitor', 'Beast', 'Machine', 'Elite', 'Legend'];
// XP to go from level L to L+1 grows by 100 each level: 150, 250, 350...
export function levelOf(xp) {
  let L = 1, floor = 0, need = 150;
  while (xp >= floor + need) { floor += need; L++; need += 100; }
  return { level: L, name: NAMES[Math.min(L, NAMES.length) - 1], into: xp - floor, need, xp };
}

/* ---------- Badges ---------- */
function weekAvgWeight(S, end) { const a = []; for (let i = 0; i < 7; i++) { const v = num(S.daily[addDays(end, -i)]?.weight); if (v != null) a.push(v); } return a.length >= 2 ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function latestWaist(S) { const w = S.checkins.filter(c => num(c.waist) != null).sort((a, b) => a.date < b.date ? -1 : 1); return w.length ? num(w[w.length - 1].waist) : null; }
export const BADGES = [
  { id: 'first_session', icon: '🏁', n: 'First session', d: 'Finish your first workout.', test: (S) => [...allRecs(S)].some(x => x.rec.done) },
  { id: 'perfect_week', icon: '💯', n: 'Perfect week', d: 'All 4 sessions in one week.', test: (S, t) => { for (let w = 1; w <= calWeek(S, t); w++) if (doneInWeek(S, w).size >= 4) return true; return false; } },
  { id: 'streak_4', icon: '🔥', n: 'On fire', d: '4 perfect weeks in a row.', test: (S, t, st) => st.weeks >= 4 },
  { id: 'first_pr', icon: '🏆', n: 'First record', d: 'Beat your best on any lift.', test: (S, t, st, prs) => prs >= 1 },
  { id: 'pr_10', icon: '🥇', n: '10 records', d: 'Set 10 lift records.', test: (S, t, st, prs) => prs >= 10 },
  { id: 'pr_30', icon: '👑', n: '30 records', d: 'Set 30 lift records.', test: (S, t, st, prs) => prs >= 30 },
  { id: 'kg_1', icon: '📉', n: 'First kilo', d: 'Weekly average 1 kg under your start.', test: (S, t) => { const a = weekAvgWeight(S, t); return a != null && a <= S.inbody[0].weight - 1; } },
  { id: 'kg_5', icon: '⚡', n: 'Five down', d: 'Weekly average 5 kg under your start.', test: (S, t) => { const a = weekAvgWeight(S, t); return a != null && a <= S.inbody[0].weight - 5; } },
  { id: 'goal', icon: '🎯', n: 'Goal weight', d: 'Weekly average at your goal weight.', test: (S, t) => { const a = weekAvgWeight(S, t); return a != null && a <= S.profile.goalWeight; } },
  { id: 'waist_2', icon: '📏', n: 'Belt notch', d: 'Waist down 2 cm from your start.', test: (S) => { const w = latestWaist(S), b = num(S.baseline?.waist); return w != null && b != null && b - w >= 2; } },
  { id: 'waist_5', icon: '🔻', n: 'New jeans', d: 'Waist down 5 cm from your start.', test: (S) => { const w = latestWaist(S), b = num(S.baseline?.waist); return w != null && b != null && b - w >= 5; } },
  { id: 'checkin', icon: '📋', n: 'Checked in', d: 'Do your first weekly check-in.', test: (S) => S.checkins.length >= 1 },
  { id: 'chef', icon: '👨‍🍳', n: 'Meal prepper', d: 'Tick 5 cook nights done.', test: (S) => Object.values(S.daily).filter(d => d.cooked).length >= 5 },
  { id: 'big_cook', icon: '🍲', n: 'Big cook night', d: 'Cook your first monthly big meal.', test: (S) => Object.values(S.daily).some(d => d.cookedBig) },
  { id: 'creatine_30', icon: '💊', n: '30 days of creatine', d: 'Creatine 30 days in a row.', test: (S, t, st) => st.creatine >= 30 },
  { id: 'faster', icon: '🏃', n: 'Faster', d: 'Beat your first 12-minute run test.', test: (S) => S.tests.length >= 2 && S.tests[S.tests.length - 1].m > S.tests[0].m },
  { id: 'block', icon: '🎖️', n: '12 weeks done', d: 'Finish the 12-week block.', test: (S, t) => planWeek(S, t) > 12 }
];
// Everything the UI needs in one go.
export function progress(S, today) {
  const st = streaks(S, today), prs = recordCount(S), xp = xpTotal(S, today), lv = levelOf(xp);
  const earned = BADGES.filter(b => (S.game?.badges || {})[b.id] || b.test(S, today, st, prs)).map(b => b.id);
  return { st, prs, xp, lv, earned };
}
// Is today a big cook night?
export function cookToday(S, k) {
  const c = cycleFor(S, k); if (!c) return null;
  return cookSessions(S, c).find(s => s.date === k && s.dishes.length) || null;
}
export function goalProgress(S, today) {
  const start = S.inbody[0].weight, goal = S.profile.goalWeight;
  const cur = weekAvgWeight(S, today);
  const v = cur ?? start;
  return { start, goal, cur, pct: Math.max(0, Math.min(1, (start - v) / (start - goal || 1))), left: r1(v - goal) };
}
export { diffDays };
