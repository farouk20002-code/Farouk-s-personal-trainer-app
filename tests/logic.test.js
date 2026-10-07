import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../js/store.js';
import { clone, addDays } from '../js/util.js';
import { generateCycle, flexFactor, dayPlan, cookSessions, shoppingList, cycleDates, recipe } from '../js/mealplan.js';
import { evaluate } from '../js/adapt.js';
import { getRec, exRec, planWeek, stalled, suggestion } from '../js/training.js';
import { parseImport } from '../js/status.js';
import { buildICS } from '../js/ics.js';

const fresh = () => clone(DEFAULTS);

test('meal plan hits the calorie target on average and never plans away days', () => {
  for (const mode of ['one', 'two']) for (const kcal of [1900, 2200, 2500]) {
    const S = fresh(); S.profile.cookMode = mode; S.profile.kcal = kcal;
    const c = generateCycle(S, '2026-10-10', 42, null), f = flexFactor(S, c);
    let tot = 0, tgt = 0;
    for (const d of cycleDates(c)) {
      const dp = dayPlan(S, c, d, f);
      const dw = new Date(d + 'T00:00').getDay();
      if (dw === 5 || dw === 6) { assert.equal(dp, null, 'Fri/Sat are away'); continue; }
      tot += dp.t.kcal; tgt += dp.target;
      for (const m of dp.meals) assert.ok(m.r, 'every slot resolves to a recipe');
    }
    assert.ok(Math.abs(tot / tgt - 1) < 0.06, `${mode} ${kcal}: average within 6% (got ${(tot / tgt).toFixed(3)})`);
  }
});

test('every cook session has a dish and batch food is eaten within its keep time', () => {
  const S = fresh();
  for (const seed of [1, 2, 3, 99, 1234]) {
    const c = generateCycle(S, '2026-10-10', seed, null);
    for (const s of cookSessions(S, c)) {
      assert.ok(s.dishes.length >= 1, 'a dish every cook night');
      for (const x of s.dishes) for (const [d] of x.eats) {
        const age = (new Date(d) - new Date(s.date)) / 864e5;
        assert.ok(age <= (x.r.keeps || 3), `${x.r.id} eaten ${age} days after cooking`);
      }
    }
    // One-dish mode: the cook-night dinner is the batch dish, so lunch-only dishes must not be picked.
    for (const k of c.cooks) assert.ok(recipe(S, k.a).slots.includes('dinner'));
  }
});

test('shopping list covers everything and the next cycle avoids repeating dishes', () => {
  const S = fresh();
  const c1 = generateCycle(S, '2026-10-10', 7, null), c2 = generateCycle(S, '2026-10-24', 8, c1);
  const l = shoppingList(S, c1);
  assert.ok(l.total > 0 && l.rows.every(r => r.packs >= 1));
  const a = new Set(c1.cooks.map(k => k.a)), overlap = c2.cooks.filter(k => a.has(k.a)).length;
  assert.ok(overlap <= 1, 'mostly new dishes in the next 2 weeks');
});

function logWeeks(S, end, weights, opts = {}) {
  // weights: per-day values, oldest first, ending at `end`
  weights.forEach((w, i) => { const k = addDays(end, i - weights.length + 1); S.daily[k] = { weight: String(w), steps: String(opts.steps ?? 9000), sleep: String(opts.sleep ?? 7), food: opts.food ?? 'yes' }; });
  for (let i = 0; i < 4; i++) { const k = addDays(end, -i - 1); S.logs[k] = { LA: { done: true, ex: {} } }; }
}

test('adaptive check-in: plateau, too fast, consistency and steps', () => {
  const end = '2026-11-14';
  let S = fresh(); logWeeks(S, end, Array(21).fill(84));
  assert.equal(evaluate(S, end).cause, 'need_waist');
  S.checkins.push({ date: '2026-10-31', waist: 95 });
  let r = evaluate(S, end, 95); assert.equal(r.cause, 'plateau'); assert.equal(r.delta, -150);
  r = evaluate(S, end, 94); assert.equal(r.cause, 'recomp');

  S = fresh(); logWeeks(S, end, Array(21).fill(84), { steps: 5000 }); S.checkins.push({ date: '2026-10-31', waist: 95 });
  assert.equal(evaluate(S, end, 95).cause, 'steps');

  S = fresh(); logWeeks(S, end, [...Array(7).fill(86), ...Array(7).fill(85), ...Array(7).fill(84)]);
  assert.equal(evaluate(S, end).cause, 'too_fast');

  S = fresh(); logWeeks(S, end, Array(21).fill(84), { food: 'no' });
  assert.equal(evaluate(S, end).cause, 'consistency');

  S = fresh(); assert.equal(evaluate(S, '2026-10-15').cause, 'Hold');
});

test('two sessions on the same day are stored separately (old crash)', () => {
  const S = fresh();
  const a = getRec(S, '2026-10-12', 'UA', true); exRec(S, a, 'bench', 1).sets[0] = { w: '40', r: '8', done: true };
  const b = getRec(S, '2026-10-12', 'LA', true); exRec(S, b, 'back_squat', 1).sets[0] = { w: '60', r: '8', done: true };
  assert.ok(S.logs['2026-10-12'].UA && S.logs['2026-10-12'].LA);
});

test('progression and stall detection', () => {
  const S = fresh();
  ['2026-10-12', '2026-10-19', '2026-10-26'].forEach(d => { const r = getRec(S, d, 'UA', true); r.ex.bench = { alt: -1, sets: [1, 2, 3].map(() => ({ w: '50', r: '6', done: true })) }; });
  assert.equal(stalled(S, 'bench', 'Barbell bench press', '2026-11-02'), true);
  const S2 = fresh(); const r = getRec(S2, '2026-10-26', 'UA', true); r.ex.bench = { alt: -1, sets: [1, 2, 3].map(() => ({ w: '50', r: '8', done: true })) };
  assert.match(suggestion(S2, 'bench', 'Barbell bench press', '2026-11-02', 3).t, /52\.5 kg/);
});

test('paused weeks shift the plan', () => {
  const S = fresh(); S.pausedWeeks = [3];
  assert.equal(planWeek(S, '2026-10-25'), 3);   // calendar week 3 (paused) still reports 3
  assert.equal(planWeek(S, '2026-11-01'), 3);   // calendar week 4 is training week 3
});

test('recipe import validates and keeps only known ingredients', () => {
  const S = fresh();
  const txt = 'blah\n```json\n{"recipes":[{"n":"X","kind":"batch","slots":["lunch"],"items":[["chicken",150],["rice",70,1],["nope",2]],"steps":["a"]}]}\n```';
  const r = parseImport(S, txt);
  assert.equal(r.recipes.length, 1); assert.equal(r.recipes[0].items.length, 2); assert.equal(r.errors.length, 1);
  assert.equal(parseImport(S, 'no json here').recipes.length, 0);
});

test('calendar file is well formed', () => {
  const ics = buildICS(fresh(), '2026-10-07', { gym: true, cook: true, shop: true, weigh: true, sleep: true, checkin: true, posture: true });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR') && ics.endsWith('END:VCALENDAR'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
});
