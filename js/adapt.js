// The adaptive part: looks at the last 3 weeks and decides what (if anything) to change, and why.
import { addDays, diffDays, num, avg, r1 } from './util.js';
import { allRecs, calWeek, isPaused, strengthTrend } from './training.js';

export const KCAL_FLOOR = 1900;
const STEP = 150;

function windowVals(S, end, from, to, field) {
  const a = [];
  for (let i = from; i <= to; i++) { const v = num(S.daily[addDays(end, -i)]?.[field]); if (v != null) a.push(v); }
  return a;
}
export function weightAvg(S, end, weeksBack = 0) {
  const a = windowVals(S, end, weeksBack * 7, weeksBack * 7 + 6, 'weight');
  return a.length >= 3 ? avg(a) : null;
}
export function foodScore(S, end) {
  const a = [];
  for (let i = 0; i < 7; i++) { const v = S.daily[addDays(end, -i)]?.food; if (v) a.push(v === 'yes' ? 1 : v === 'partly' ? 0.5 : 0); }
  return a.length >= 3 ? avg(a) : null;
}
export function sessionsLast7(S, end) {
  const from = addDays(end, -6); let n = 0;
  for (const { date, rec } of allRecs(S)) if (rec.done && date >= from && date <= end) n++;
  return n;
}
// Waist now vs. about two weeks ago (check-ins, or the baseline you measured before starting).
export function waistChange(S, end, waistNow) {
  const all = S.checkins.filter(c => num(c.waist) != null).map(c => ({ date: c.date, v: num(c.waist) }));
  if (num(S.baseline?.waist) != null) all.push({ date: S.baseline.date || S.profile.startDate, v: num(S.baseline.waist) });
  const now = num(waistNow) ?? all.filter(x => x.date <= end).sort((a, b) => a.date < b.date ? 1 : -1)[0]?.v;
  if (now == null) return null;
  const old = all.filter(x => { const d = diffDays(x.date, end); return d >= 11 && d <= 24; }).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  return old ? r1(old.v - now) : null;
}

export function stats(S, end, waistNow) {
  const cw = calWeek(S, end);
  return {
    w0: weightAvg(S, end, 0), w1: weightAvg(S, end, 1), w2: weightAvg(S, end, 2),
    sessions: sessionsLast7(S, end), planned: isPaused(S, cw) ? 0 : 4,
    food: foodScore(S, end),
    steps: avg(windowVals(S, end, 0, 6, 'steps')), sleep: avg(windowVals(S, end, 0, 6, 'sleep')),
    waistDrop: waistChange(S, end, waistNow),
    trend: strengthTrend(S, end),
    days: diffDays(S.profile.startDate, end),
    sinceChange: (() => { const h = S.kcalHistory.filter(x => x.auto !== false); const last = h[h.length - 1]; return last ? diffDays(last.date, end) : 999; })()
  };
}

// verdict, text, delta (kcal change to offer), why (list of the checks), cause.
export function evaluate(S, end, waistNow) {
  const st = stats(S, end, waistNow), why = [];
  const pct = (a, b) => (a - b) / a * 100; // positive = weight going down
  if (st.w0 != null) why.push(`7-day average weight: ${r1(st.w0)} kg${st.w1 != null ? ` (last week ${r1(st.w1)} kg)` : ''}`);
  why.push(`Sessions in the last 7 days: ${st.sessions} of ${st.planned}`);
  if (st.food != null) why.push(`Ate to plan: about ${Math.round(st.food * 100)}% of days`);
  if (st.steps != null) why.push(`Steps: ${Math.round(st.steps).toLocaleString('en-GB')} a day`);
  if (st.sleep != null) why.push(`Sleep: ${r1(st.sleep)} h a night`);
  if (st.waistDrop != null) why.push(`Waist: ${st.waistDrop >= 0 ? 'down' : 'up'} ${Math.abs(st.waistDrop)} cm in about 2 weeks`);
  if (st.trend.total) why.push(`Lifts (last 2 weeks vs the 2 before): ${st.trend.up} up, ${st.trend.flat} flat, ${st.trend.down} down`);
  const out = (verdict, text, delta = 0, cause = verdict) => ({ verdict, text, delta, cause, why, st });

  if (st.days < 14) return out('Hold', 'Too early to judge. The first two weeks are mostly water and stored carbs moving around. Keep going exactly as you are.');
  if (st.w0 == null || st.w1 == null) return out('Need more data', 'Weigh yourself at least 3–4 mornings a week (after the toilet, before food). Without that the app can\'t tell a plateau from a bad day.');
  if (st.planned && (st.sessions < 3 || (st.food != null && st.food < 0.6))) return out('Fix consistency first', `You did ${st.sessions} of ${st.planned} sessions${st.food != null ? ` and ate to plan about ${Math.round(st.food * 100)}% of days` : ''}. Cutting calories won't help if the plan isn't happening. This week: hit protein every day and show up for all 4 sessions. No calorie change.`, 0, 'consistency');

  const r1w = pct(st.w1, st.w0), r2w = st.w2 != null ? pct(st.w2, st.w1) : null;
  if (r1w > 1.0 && (r2w == null || r2w > 0.8)) return out('Losing too fast', `Down ${r1w.toFixed(1)}% this week. Faster than 1% a week starts eating muscle. Add ${STEP} calories (the app adds it as rice, oats and bread).`, STEP, 'too_fast');
  if (r1w > 0.6 && st.trend.down >= 2 && st.trend.down > st.trend.up) return out('Strength dropping', `You're losing ${r1w.toFixed(1)}% a week and ${st.trend.down} lifts went down. Add ${STEP} calories, mostly around training, so you keep your muscle.`, STEP, 'strength');

  if (st.w2 != null && pct(st.w2, st.w0) < 0.3) {
    if (st.waistDrop != null && st.waistDrop >= 0.5) return out('Recomp working', `The scale is flat but your waist is down ${st.waistDrop} cm. You're losing fat and adding muscle. No change.`, 0, 'recomp');
    if (st.sinceChange < 14) return out('Give the last change time', `Weight is flat, but your calories changed ${st.sinceChange} days ago. Changes need 2 weeks to show. No change yet.`, 0, 'wait');
    if (st.steps != null && st.steps < 7000) return out('Plateau: move more first', `Weight flat for 2 weeks. Your steps average ${Math.round(st.steps).toLocaleString('en-GB')}. Get to 8,000–9,000 a day (a 20-minute walk after dinner does it) before eating less. Check again in 2 weeks.`, 0, 'steps');
    if (st.sleep != null && st.sleep < 6.3) return out('Plateau: sleep', `Weight flat and you're sleeping ${r1(st.sleep)} h. Short sleep raises hunger and water retention. Aim for 7 h this week (in bed by 10:30 on gym nights). No calorie change yet.`, 0, 'sleep');
    if (st.waistDrop == null) return out('Plateau: measure your waist', 'Weight flat for 2 weeks. Measure your waist at the belly button in the check-in so the app can tell fat loss from a real stall.', 0, 'need_waist');
    return out('Real plateau', `Weight and waist flat for 2 weeks with good consistency, steps and sleep. Drop ${STEP} calories. The app takes it from rice, bread and oil, protein stays the same.`, -STEP, 'plateau');
  }
  if (r1w < 0.2 && r2w != null && r2w < 0.2) return out('Slowing down', `Weight barely moved for 2 weeks (${r1w.toFixed(2)}% this week). One more week of data before changing anything. Keep steps up and weigh in daily.`, 0, 'slowing');
  return out('On track', `Down ${r1w.toFixed(2)}% this week. The sweet spot is 0.4–1% a week. No change.`, 0, 'ok');
}
export const applyDelta = (kcal, delta) => Math.max(KCAL_FLOOR, kcal + delta);
