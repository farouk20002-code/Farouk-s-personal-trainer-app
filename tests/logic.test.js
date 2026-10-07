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

test('removed dishes are never planned', () => {
  const S = fresh(); S.hiddenRecipes = ['molokhia', 'tray', 'kofta', 'shawarma', 'sayadeya'];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const c = generateCycle(S, '2026-10-10', seed, null);
    for (const day of Object.values(c.days)) for (const sl of Object.values(day)) {
      const id = sl.rid || c.cooks[sl.cook][sl.role];
      assert.ok(!S.hiddenRecipes.includes(id), `planned removed dish ${id}`);
    }
  }
});

test('normal cook nights are easy; one big night a month', async () => {
  const { isBig } = await import('../js/mealplan.js');
  const S = fresh();
  const first = generateCycle(S, '2026-11-07', 3, null), second = generateCycle(S, '2026-11-21', 4, first);
  assert.equal(first.cooks.filter(k => k.big).length, 1, 'plan starting early in the month has the big night');
  assert.equal(second.cooks.filter(k => k.big).length, 0, 'the other plan that month has none');
  for (const k of first.cooks) assert.equal(isBig(recipe(S, k.a)), !!k.big);
  for (const k of second.cooks) assert.ok(!isBig(recipe(S, k.a)), 'weeknight dishes are easy');
  S.profile.bigMeal = false;
  assert.equal(generateCycle(S, '2026-11-07', 3, null).cooks.filter(k => k.big).length, 0);
});

test('every food has an Arabic name', async () => {
  const { FOODS } = await import('../js/foods.js');
  for (const f of FOODS) assert.ok(f.ar && /[\u0600-\u06FF]/.test(f.ar), `${f.id} has no Arabic name`);
});

test('rings, streaks, records and levels', async () => {
  const G = await import('../js/game.js');
  const S = fresh();
  // Sunday 2026-10-11: train, food, creatine, posture, weigh-in
  assert.deepEqual(G.rings(S, '2026-10-11').map(r => r.id), ['train', 'food', 'creatine', 'posture', 'weigh']);
  // Friday: away, only creatine
  assert.deepEqual(G.rings(S, '2026-10-16').map(r => r.id), ['creatine']);
  // Creatine streak: 3 days, today not done yet does not break it
  for (const k of ['2026-10-12', '2026-10-13', '2026-10-14']) S.daily[k] = { creatine: true };
  assert.equal(G.streaks(S, '2026-10-15').creatine, 3);
  // Food streak skips the weekend
  for (const k of ['2026-10-14', '2026-10-15', '2026-10-18']) S.daily[k] = { ...(S.daily[k] || {}), food: 'yes' };
  assert.equal(G.streaks(S, '2026-10-18').food, 3);
  // Records: second session heavier = 1 record, first ever is not a record
  getRec(S, '2026-10-12', 'UA', true).ex.bench = { alt: -1, sets: [{ w: '50', r: '8', done: true }] };
  getRec(S, '2026-10-19', 'UA', true).ex.bench = { alt: -1, sets: [{ w: '55', r: '8', done: true }] };
  assert.equal(G.recordCount(S), 1);
  assert.equal(G.isRecord(S, 'bench', -1, '2026-10-26', '57.5', '8', 0, 'UA'), true);
  assert.equal(G.isRecord(S, 'bench', -1, '2026-10-26', '50', '8', 0, 'UA'), false);
  // Levels
  assert.equal(G.levelOf(0).level, 1); assert.equal(G.levelOf(150).level, 2); assert.equal(G.levelOf(399).level, 2); assert.equal(G.levelOf(400).level, 3);
  // Perfect-week streak
  const T = fresh();
  for (const [d, sid] of [['2026-10-11', 'LA'], ['2026-10-12', 'UA'], ['2026-10-13', 'LB'], ['2026-10-14', 'UB']]) getRec(T, d, sid, true).done = true;
  assert.equal(G.streaks(T, '2026-10-20').weeks, 1);
});
