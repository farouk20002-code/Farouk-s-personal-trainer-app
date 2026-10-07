// Sample data for the design preview only: two weeks of plausible training, food and weigh-ins.
// Loaded when the page sets window.__DEMO__; the real app never runs this.
import { addDays, todayKey, dow } from './util.js';
import { SESSIONS, DAYPLAN, EX, getRec, exRec, setsFor, topReps, lowReps } from './training.js';
import { generateCycle, shopDayOnOrBefore } from './mealplan.js';

const BASE = { back_squat: 60, rdl: 50, walk_lunge: 12, leg_curl: 30, calf_stand: 40, bench: 45, pulldown: 45, cable_row: 45, incline_db: 16, face_pull: 15, db_lateral: 6, cable_curl: 15, rope_pushdown: 17.5, leg_press: 100, bss: 10, hip_thrust: 60, leg_ext: 35, calf_seated: 30, cable_crunch: 25, incline_smith: 40, pullup: -25, cs_row: 18, pec_deck: 35, db_ohp: 14, cable_lateral: 5, incline_curl: 8, oh_ext: 15 };

export function seedDemo(S) {
  const t = todayKey();
  // Start the plan on the Sunday 15–21 days ago, so the preview sits in week 3.
  let start = addDays(t, -15); while (dow(start) !== 0) start = addDays(start, -1);
  S.profile.startDate = start;
  S.baseline = { waist: 98, date: addDays(start, -4), neck: '' };
  S.prep = Object.fromEntries(['inbody', 'creatine', 'tape', 'plan', 'boxes', 'photos', 'reminders', 'bag'].map(k => [k, true]));
  let wgt = 86.6, k = start, i = 0;
  while (k < t) {
    const d = dow(k), week = Math.floor(i / 7) + 1;
    const day = S.daily[k] = {};
    wgt -= 0.07 + ((i * 37) % 10 - 5) / 100;
    if ([0, 2, 4].includes(d)) day.weight = (Math.round(wgt * 10) / 10).toFixed(1);
    if (d <= 4) { day.food = i === 3 ? 'partly' : 'yes'; day.posture = i % 5 !== 1; }
    day.creatine = true;
    day.steps = String(7200 + ((i * 1311) % 3600));
    day.sleep = (6.4 + ((i * 7) % 9) / 10).toFixed(1);
    if (d === 4) day.acts = [{ t: 'football', min: 80 }];
    const kind = DAYPLAN[d];
    if (SESSIONS[kind]) {
      const rec = getRec(S, k, kind, true);
      for (const id of SESSIONS[kind].ex) {
        const e = EX[id], x = exRec(S, rec, id, week);
        const w0 = BASE[id];
        x.sets.slice(0, setsFor(id, week)).forEach((s, j) => {
          s.w = e.bw || w0 == null ? '' : String(w0 + (week - 1) * (e.inc || 2.5));
          s.r = String(j === 0 ? topReps(e.reps) : Math.max(lowReps(e.reps), topReps(e.reps) - j));
          s.done = true;
        });
      }
      rec.done = true; rec.finishedAt = k + 'T07:10:00';
    }
    if (d === 0 || d === 2) { day.cooked = true; }
    k = addDays(k, 1); i++;
  }
  S.checkins = [{ date: addDays(start, 6), week: 1, avg: 86.4, waist: 97.5, rhr: 68, note: '', verdict: 'Hold', kcal: 2200 }];
  S.meal.cycles = [generateCycle(S, shopDayOnOrBefore(S, t), 20261011, null)];
  S.lastBackup = t;
  S.demoSeeded = true;
  return S;
}
