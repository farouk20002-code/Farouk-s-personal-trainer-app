// Training plan: exercises, sessions, 12-week phases, logging and progression.
import { addDays, diffDays, num, dow } from './util.js';

export const EQUIP = [['barbell', 'Barbells and plates'], ['rack', 'Squat / power racks'], ['smith', 'Smith machine'], ['bench', 'Flat and incline benches'], ['dumbbells', 'Dumbbells'], ['cables', 'Cable stations'], ['latpulldown', 'Lat pulldown'], ['seatedrow', 'Seated row machine'], ['chestpress', 'Chest press machine'], ['pecdeck', 'Pec deck / fly machine'], ['shoulderpress', 'Shoulder press machine'], ['pullupbar', 'Pull-up bar / assisted pull-up'], ['dip', 'Dip station'], ['legpress', 'Leg press'], ['hacksquat', 'Hack squat'], ['legcurl', 'Leg curl machine'], ['legext', 'Leg extension'], ['hipthrust', 'Hip thrust machine'], ['calfstand', 'Standing calf raise'], ['calfseated', 'Seated calf raise'], ['plyobox', 'Plyo boxes'], ['bike', 'Bikes'], ['treadmill', 'Treadmills'], ['rower', 'Rowers'], ['track', 'Running track'], ['pool', 'Pool']];

// bw: bodyweight or jump exercise, weight is optional.
export const EX = {
  box_jump: { n: 'Box jump', sets: 3, reps: '5', rest: 90, kind: 'power', area: 'lower', bw: true, eq: ['plyobox'], cue: 'Do it first, while fresh. Land soft, step down, reset each rep. Speed matters, not box height.', alts: [['Squat jump', []], ['Broad jump', []]] },
  back_squat: { n: 'Barbell back squat', sets: 3, reps: '6–8', rest: 150, kind: 'main', area: 'lower', inc: 5, eq: ['barbell', 'rack'], cue: 'Two warm-up sets first. Brace hard, sit down between your heels, drive up.', alts: [['Hack squat', ['hacksquat']], ['Smith machine squat', ['smith']], ['Leg press', ['legpress']], ['Goblet squat', ['dumbbells']]] },
  rdl: { n: 'Romanian deadlift', sets: 3, reps: '8–10', rest: 120, kind: 'main', area: 'lower', inc: 5, eq: ['barbell'], cue: 'Push hips back, bar close to your legs, back flat. Feel the hamstring stretch.', alts: [['Dumbbell Romanian deadlift', ['dumbbells']], ['Cable pull-through', ['cables']]] },
  walk_lunge: { n: 'Walking lunge (dumbbells)', sets: 2, reps: '10 / leg', rest: 90, kind: 'acc', area: 'lower', inc: 2, eq: ['dumbbells'], cue: 'Long steps, knee tracks over toes. This one carries straight onto the pitch.', alts: [['Reverse lunge on Smith machine', ['smith']], ['Step-up', ['bench', 'dumbbells']]] },
  leg_curl: { n: 'Lying leg curl', sets: 2, reps: '10–12', rest: 75, kind: 'acc', area: 'lower', inc: 2.5, eq: ['legcurl'], cue: 'Slow on the way down. Strong hamstrings protect you when you sprint.', alts: [['Dumbbell leg curl', ['dumbbells', 'bench']], ['Swiss-ball or slider leg curl', []]] },
  calf_stand: { n: 'Standing calf raise', sets: 3, reps: '12–15', rest: 60, kind: 'acc', area: 'lower', inc: 5, eq: ['calfstand'], cue: 'Full stretch at the bottom, pause at the top.', alts: [['Calf raise on leg press', ['legpress']], ['Smith machine calf raise', ['smith']], ['Single-leg dumbbell calf raise', ['dumbbells']]] },
  knee_raise: { n: 'Hanging knee raise', sets: 2, reps: '10–15', rest: 60, kind: 'core', area: 'lower', bw: true, eq: ['pullupbar'], cue: 'Curl your pelvis up, no swinging.', alts: [['Cable crunch', ['cables']], ['Dead bug', []]] },
  bench: { n: 'Barbell bench press', sets: 3, reps: '6–8', rest: 150, kind: 'main', area: 'upper', inc: 2.5, eq: ['barbell', 'bench'], cue: 'Two warm-up sets. Shoulder blades pinched, feet planted, touch mid-chest.', alts: [['Dumbbell bench press', ['dumbbells', 'bench']], ['Chest press machine', ['chestpress']], ['Smith machine bench press', ['smith', 'bench']]] },
  pulldown: { n: 'Lat pulldown', sets: 3, reps: '8–10', rest: 120, kind: 'main', area: 'upper', inc: 2.5, eq: ['latpulldown'], cue: 'Chest up, pull your elbows down to your back pockets. No swinging.', alts: [['Assisted pull-up', ['pullupbar']], ['Single-arm cable pulldown', ['cables']]] },
  cable_row: { n: 'Seated cable row', sets: 3, reps: '8–10', rest: 120, kind: 'main', area: 'upper', inc: 2.5, eq: ['seatedrow'], cue: 'Pause one second with the handle at your stomach.', alts: [['Low cable row', ['cables']], ['One-arm dumbbell row', ['dumbbells', 'bench']]] },
  incline_db: { n: 'Incline dumbbell press', sets: 3, reps: '8–10', rest: 120, kind: 'acc', area: 'upper', inc: 2, eq: ['dumbbells', 'bench'], cue: 'Bench at about 30°. Upper chest is what makes a tall frame look full.', alts: [['Incline Smith machine press', ['smith', 'bench']], ['Chest press machine', ['chestpress']]] },
  db_lateral: { n: 'Dumbbell lateral raise', sets: 3, reps: '12–15', rest: 60, kind: 'acc', area: 'upper', inc: 1, eq: ['dumbbells'], cue: 'Light weight, lead with your elbows, stop at shoulder height. Wider shoulders, smaller-looking waist.', alts: [['Cable lateral raise', ['cables']]] },
  cable_curl: { n: 'Cable curl', sets: 2, reps: '10–12', rest: 60, kind: 'acc', area: 'upper', inc: 2.5, eq: ['cables'], cue: 'Elbows pinned to your sides.', alts: [['Dumbbell curl', ['dumbbells']], ['EZ-bar curl', ['barbell']]] },
  rope_pushdown: { n: 'Rope triceps pushdown', sets: 2, reps: '10–12', rest: 60, kind: 'acc', area: 'upper', inc: 2.5, eq: ['cables'], cue: 'Spread the rope at the bottom, elbows still.', alts: [['Overhead dumbbell extension', ['dumbbells']], ['Assisted dip', ['dip']]] },
  lat_bound: { n: 'Lateral bound', sets: 3, reps: '4 / side', rest: 90, kind: 'power', area: 'lower', bw: true, eq: [], cue: 'Jump sideways, stick the landing on one leg for a second. Trains change of direction.', alts: [['Skater jump', []], ['Box jump', ['plyobox']]] },
  leg_press: { n: 'Leg press', sets: 3, reps: '10–12', rest: 120, kind: 'main', area: 'lower', inc: 10, eq: ['legpress'], cue: 'Feet shoulder width. Go deep without your lower back lifting off the pad.', alts: [['Hack squat', ['hacksquat']], ['Smith machine squat', ['smith']], ['Goblet squat', ['dumbbells']]] },
  bss: { n: 'Bulgarian split squat', sets: 3, reps: '8 / leg', rest: 90, kind: 'acc', area: 'lower', inc: 2, eq: ['dumbbells', 'bench'], cue: 'Back foot on a bench. The hardest exercise in the plan, and the best one for football.', alts: [['Smith machine split squat', ['smith', 'bench']], ['Reverse lunge (dumbbells)', ['dumbbells']]] },
  hip_thrust: { n: 'Hip thrust machine', sets: 3, reps: '8–10', rest: 120, kind: 'main', area: 'lower', inc: 5, eq: ['hipthrust'], cue: 'Chin tucked, squeeze your glutes hard at the top for one second. This is sprint power.', alts: [['Barbell hip thrust', ['barbell', 'bench']], ['Dumbbell glute bridge', ['dumbbells']], ['Cable pull-through', ['cables']]] },
  leg_ext: { n: 'Leg extension', sets: 2, reps: '12–15', rest: 60, kind: 'acc', area: 'lower', inc: 5, eq: ['legext'], cue: 'Pause at the top, slow down.', alts: [['Slow goblet squat', ['dumbbells']], ['Assisted sissy squat', []]] },
  calf_seated: { n: 'Seated calf raise', sets: 3, reps: '12–15', rest: 60, kind: 'acc', area: 'lower', inc: 5, eq: ['calfseated'], cue: 'Full range, pause at the top.', alts: [['Standing calf raise', ['calfstand']], ['Calf raise on leg press', ['legpress']]] },
  cable_crunch: { n: 'Cable crunch', sets: 3, reps: '10–15', rest: 60, kind: 'core', area: 'lower', inc: 2.5, eq: ['cables'], cue: 'Crunch your ribs toward your hips. Hips stay still.', alts: [['Hanging knee raise', ['pullupbar']], ['Dead bug', []]] },
  incline_smith: { n: 'Incline Smith machine press', sets: 3, reps: '6–8', rest: 150, kind: 'main', area: 'upper', inc: 2.5, eq: ['smith', 'bench'], cue: 'Two warm-up sets. Bench at about 30°.', alts: [['Incline barbell press', ['barbell', 'bench']], ['Incline dumbbell press', ['dumbbells', 'bench']], ['Chest press machine', ['chestpress']]] },
  pullup: { n: 'Pull-up (assisted if needed)', sets: 3, reps: '6–10', rest: 120, kind: 'main', area: 'upper', inc: 2.5, eq: ['pullupbar'], cue: 'On the assisted machine, use the least help that still lets you do 6 clean reps. Log the assistance as a negative number (e.g. -20). Progress = less assistance.', alts: [['Lat pulldown', ['latpulldown']], ['Single-arm cable pulldown', ['cables']]] },
  cs_row: { n: 'Chest-supported dumbbell row', sets: 3, reps: '8–10', rest: 120, kind: 'acc', area: 'upper', inc: 2, eq: ['dumbbells', 'bench'], cue: 'Chest on an incline bench. No momentum, pure back.', alts: [['Machine row', ['seatedrow']], ['One-arm cable row', ['cables']]] },
  pec_deck: { n: 'Pec deck fly', sets: 2, reps: '12–15', rest: 60, kind: 'acc', area: 'upper', inc: 2.5, eq: ['pecdeck'], cue: 'Slow stretch, squeeze for one second.', alts: [['Cable fly', ['cables']], ['Dumbbell fly', ['dumbbells', 'bench']]] },
  db_ohp: { n: 'Seated dumbbell shoulder press', sets: 3, reps: '8–10', rest: 120, kind: 'acc', area: 'upper', inc: 2, eq: ['dumbbells', 'bench'], cue: 'Don\'t lock out hard. Control the bottom.', alts: [['Shoulder press machine', ['shoulderpress']], ['Smith machine shoulder press', ['smith', 'bench']]] },
  cable_lateral: { n: 'Cable lateral raise', sets: 3, reps: '12–15', rest: 60, kind: 'acc', area: 'upper', inc: 1, eq: ['cables'], cue: 'One arm at a time, cable behind you.', alts: [['Dumbbell lateral raise', ['dumbbells']]] },
  incline_curl: { n: 'Incline dumbbell curl', sets: 2, reps: '10–12', rest: 60, kind: 'acc', area: 'upper', inc: 1, eq: ['dumbbells', 'bench'], cue: 'Arms hang behind you. Big stretch.', alts: [['Cable curl', ['cables']], ['EZ-bar curl', ['barbell']]] },
  face_pull: { n: 'Face pull', sets: 3, reps: '12–15', rest: 60, kind: 'acc', area: 'upper', inc: 2.5, eq: ['cables'], cue: 'Rope at face height. Pull to your eyes with elbows high, squeeze your shoulder blades together and rotate your thumbs back. This is your posture exercise.', alts: [['Reverse pec deck', ['pecdeck']], ['Band pull-apart', []], ['Prone Y-raise, light dumbbells', ['dumbbells', 'bench']]] },
  oh_ext: { n: 'Overhead cable triceps extension', sets: 2, reps: '10–12', rest: 60, kind: 'acc', area: 'upper', inc: 2.5, eq: ['cables'], cue: 'Face away from the stack, stretch deep.', alts: [['Overhead dumbbell extension', ['dumbbells']], ['Assisted dip', ['dip']]] }
};

export const SESSIONS = {
  LA: { n: 'Lower A', focus: 'Leg strength and jumps', ex: ['box_jump', 'back_squat', 'rdl', 'walk_lunge', 'leg_curl', 'calf_stand', 'knee_raise'] },
  UA: { n: 'Upper A', focus: 'Chest, back and arms', ex: ['bench', 'pulldown', 'cable_row', 'incline_db', 'face_pull', 'db_lateral', 'cable_curl', 'rope_pushdown'] },
  LB: { n: 'Lower B', focus: 'Single-leg power and glutes', ex: ['lat_bound', 'leg_press', 'bss', 'hip_thrust', 'leg_ext', 'calf_seated', 'cable_crunch'] },
  UB: { n: 'Upper B', focus: 'Upper chest, back, shoulders, then conditioning', ex: ['incline_smith', 'pullup', 'cs_row', 'pec_deck', 'face_pull', 'db_ohp', 'cable_lateral', 'incline_curl', 'oh_ext'], finisher: true }
};
export const DAYPLAN = ['LA', 'UA', 'LB', 'UB', 'THU', 'OFF', 'OFF']; // Sun..Sat
export const SESSION_IDS = ['LA', 'UA', 'LB', 'UB'];

/* ---------- Weeks, pauses and blocks ---------- */
// Calendar week since the plan start (1-based, can be <1 before the start).
export const calWeek = (S, k) => Math.floor(diffDays(S.profile.startDate, k) / 7) + 1;
export const calWeekStart = (S, cw) => addDays(S.profile.startDate, (cw - 1) * 7);
export const isPaused = (S, cw) => (S.pausedWeeks || []).includes(cw);
// Training week after skipping paused weeks. 13+ means block 2 and later.
export function planWeek(S, k) {
  const cw = calWeek(S, k);
  if (cw < 1) return cw;
  return cw - (S.pausedWeeks || []).filter(p => p < cw).length;
}
// Calendar week that holds a given training week (inverse of planWeek, skipping paused weeks).
export function calWeekOf(S, w) { let cw = w; const p = (S.pausedWeeks || []).slice().sort((a, b) => a - b); for (const x of p) if (x <= cw) cw++; return cw; }
export const blockOf = w => Math.ceil(w / 12);
export const weekInBlock = w => ((w - 1) % 12) + 1;

export function phase(wb) {
  if (wb <= 1) return { n: 'Intro week', rir: 'Stop every set with 3–4 reps left in the tank', note: '2 sets per exercise. Learn the machines, find your weights. It should feel too easy. That\'s correct.' };
  if (wb <= 5) return { n: 'Build', rir: 'Stop 1–2 reps before failure', note: 'Full sets. Each session, add a little weight or a rep.' };
  if (wb === 6) return { n: 'Deload and test', rir: 'Stop with 3 reps left', note: 'One set fewer per exercise so your body catches up. Run test Wednesday, InBody and photos this week.' };
  if (wb <= 11) return { n: 'Push', rir: 'Last set of each exercise close to failure (0–1 left)', note: 'One extra set on upper-body exercises. Upper body is your priority.' };
  return { n: 'Test week', rir: 'Stop 1–2 reps before failure', note: 'Normal sets. Run test Wednesday, InBody and photos this week.' };
}
// In block 2+, week 1 is a normal build week (you already know your weights).
export function setsFor(id, w) {
  const e = EX[id], wb = weekInBlock(w); const s = e.sets;
  if (wb <= 1 && blockOf(w) === 1) return Math.min(2, s);
  if (wb === 6) return Math.max(1, s - 1);
  if (wb >= 7 && wb <= 11 && e.area === 'upper') return Math.min(4, s + 1);
  return s;
}
export function phaseFor(w) { const wb = weekInBlock(w); if (wb === 1 && blockOf(w) > 1) return { n: 'New block: build', rir: 'Stop 1–2 reps before failure', note: 'Same sessions, your weights carry over. Beat your block 1 numbers.' }; return phase(wb); }
export function finisher(w) {
  const wb = weekInBlock(w);
  if (wb === 1 || wb === 6 || wb === 12) return { n: '12-minute run test', d: 'On the track (or a treadmill at 1% incline). Cover as much distance as you can in 12 minutes at a pace you can hold. Wear your Apple Watch for this one, then log the distance in Progress.', test: true };
  const k = { 2: 6, 3: 8, 4: 8, 5: 10, 7: 10, 8: 10, 9: 12, 10: 12, 11: 12 }[wb] || 6;
  return { n: `Bike intervals, ${k} rounds`, d: `3 minutes easy, then ${k} rounds of 30 seconds hard and 60 seconds easy, then 3 minutes easy. Hard means you can't talk. Rower, treadmill or track sprints work too.` };
}
export const dayKind = k => DAYPLAN[dow(k)];

/* ---------- Equipment and swaps ---------- */
export const avail = (S, eq) => eq.every(x => S.equipment[x] !== false);
export function defaultAlt(S, id) { const e = EX[id]; if (avail(S, e.eq)) return -1; return e.alts.findIndex(a => avail(S, a[1])); }
export function exName(id, alt) { const e = EX[id]; return alt == null || alt < 0 ? e.n : (e.alts[alt]?.[0] || e.n); }
export function topReps(reps) { const m = String(reps).match(/(\d+)(?!.*\d)/); return m ? +m[1] : 10; }
export function lowReps(reps) { const m = String(reps).match(/\d+/); return m ? +m[0] : 8; }

/* ---------- Logs: S.logs[date][sid] = {ex:{id:{alt,sets:[{w,r,done}]}}, done, finishedAt} ---------- */
export function getRec(S, date, sid, create) {
  S.logs[date] = S.logs[date] || {};
  let rec = S.logs[date][sid];
  if (!rec && create) rec = S.logs[date][sid] = { ex: {}, done: false };
  if (!create && !Object.keys(S.logs[date]).length) delete S.logs[date];
  return rec || null;
}
export function exRec(S, rec, id, w) {
  if (!rec.ex[id]) rec.ex[id] = { alt: defaultAlt(S, id), sets: [] };
  const r = rec.ex[id], n = setsFor(id, w);
  while (r.sets.length < n) r.sets.push({ w: '', r: '', done: false });
  return r;
}
export const touched = rec => !!rec && Object.values(rec.ex || {}).some(x => x.sets.some(s => s.done));
export function* allRecs(S) { for (const [date, day] of Object.entries(S.logs)) for (const [sid, rec] of Object.entries(day)) yield { date, sid, rec }; }

export function lastPerf(S, id, name, before) {
  const keys = Object.keys(S.logs).filter(k => k < before).sort().reverse();
  for (const k of keys) for (const rec of Object.values(S.logs[k])) {
    const x = rec.ex?.[id];
    if (x && exName(id, x.alt) === name) { const s = x.sets.filter(s => s.done && num(s.r)); if (s.length) return { date: k, sets: s }; }
  }
  return null;
}
// Sessions completed in a calendar week (make-ups count, wherever they happened).
export function doneInWeek(S, cw) {
  const set = new Set();
  for (const { date, sid, rec } of allRecs(S)) if (rec.done && calWeek(S, date) === cw) set.add(sid);
  return set;
}
export function sessionSummary(rec) {
  let sets = 0, vol = 0;
  for (const x of Object.values(rec.ex)) for (const s of x.sets) if (s.done) { sets++; vol += Math.max(0, num(s.w) || 0) * (num(s.r) || 0); }
  return `${sets} sets logged${vol ? `, ${Math.round(vol).toLocaleString('en-GB')} kg total volume` : ''}.`;
}

/* ---------- Progression and stalls ---------- */
// Estimated 1-rep max (Epley). For bodyweight moves, reps alone.
export const e1rm = (w, r) => (w == null || w === 0) ? r : w * (1 + r / 30);
function bestOf(sets) { let b = null; for (const s of sets) { if (!s.done) continue; const r = num(s.r); if (!r) continue; const v = e1rm(num(s.w), r); if (b == null || v > b) b = v; } return b; }
// Best estimated strength per session for one exercise name, oldest first.
export function history(S, id, name, before = '9999-99-99') {
  const out = [];
  for (const k of Object.keys(S.logs).filter(k => k < before).sort()) for (const rec of Object.values(S.logs[k])) {
    const x = rec.ex?.[id]; if (!x || exName(id, x.alt) !== name) continue;
    const b = bestOf(x.sets); if (b != null) out.push({ date: k, best: b });
  }
  return out;
}
// Stalled = the last 3 sessions of this exercise show no improvement over the first of them.
export function stalled(S, id, name, before) {
  const h = history(S, id, name, before).slice(-3);
  if (h.length < 3) return false;
  return h[2].best <= h[0].best * 1.005 && h[1].best <= h[0].best * 1.005;
}
export function suggestion(S, id, name, date, w) {
  const e = EX[id], lp = lastPerf(S, id, name, date);
  if (!lp) return null;
  const n = setsFor(id, w), top = topReps(e.reps);
  const hit = lp.sets.length >= n && lp.sets.every(q => num(q.r) >= top);
  const lw = num(lp.sets[0].w);
  if (stalled(S, id, name, date)) return { stall: true, t: 'No progress for 3 sessions. Drop the weight about 10% today and build back up, or use the swap button for a variation.' };
  if (hit && lw != null && e.inc) return { t: `Hit ${top} on every set last time. Go to ${Math.round((lw + e.inc) * 10) / 10} kg.` };
  return { t: 'Same weight, beat last time by a rep somewhere.' };
}
// Compare each lift's best in the last 14 days with the 14 days before.
export function strengthTrend(S, end) {
  const a = addDays(end, -13), b = addDays(end, -27);
  let up = 0, down = 0, flat = 0;
  const seen = new Set();
  for (const k of Object.keys(S.logs)) for (const rec of Object.values(S.logs[k])) for (const [id, x] of Object.entries(rec.ex || {})) seen.add(id + '|' + exName(id, x.alt));
  for (const key of seen) {
    const [id, name] = key.split('|');
    const h = history(S, id, name, addDays(end, 1));
    const recent = h.filter(x => x.date >= a).map(x => x.best), prior = h.filter(x => x.date >= b && x.date < a).map(x => x.best);
    if (!recent.length || !prior.length) continue;
    const r = Math.max(...recent), p = Math.max(...prior);
    if (r > p * 1.01) up++; else if (r < p * 0.97) down++; else flat++;
  }
  return { up, down, flat, total: up + down + flat };
}
