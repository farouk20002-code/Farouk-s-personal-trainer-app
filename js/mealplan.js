// Two-week meal rotation: picks recipes, scales them to the calorie target, plans cook sessions and the shopping list.
import { FOODS, food } from './foods.js';
import { RECIPES } from './recipes.js';
import { addDays, diffDays, dow, rng, shuffle, sum } from './util.js';

export const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];
export const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
// Share of the day's calories each meal is meant to carry (a day with dinner away gets a smaller target).
export const MEAL_SHARE = { breakfast: 0.27, lunch: 0.30, snack: 0.14, dinner: 0.29 };
export const CYCLE_DAYS = 14;

export const allRecipes = S => RECIPES.concat(S.customRecipes || []);
// Big = oven or long recipes, kept for the monthly big cook night. Imported recipes over 50 min count as big.
export const isBig = r => r.effort === 'big' || (!!r.custom && (r.time || 0) > 50);
// One big cook night a month: the first cook night of the 2-week plan that starts in the first half of a month.
export const hasBigNight = (S, start) => S.profile.bigMeal !== false && Number(start.slice(8, 10)) <= 14;
export const isHidden = (S, id) => (S.hiddenRecipes || []).includes(id);
export const recipe = (S, id) => allRecipes(S).find(r => r.id === id) || null;
const F = (S, id) => food(id, S.customFoods);
export const priceOf = (S, id) => S.prices[id] != null ? S.prices[id] : (F(S, id)?.price ?? 0);

/* ---------- Macros and cost ---------- */
export function itemMacros(S, id, q) { const f = F(S, id); if (!f) return [0, 0, 0, 0]; const k = q / f.b; return f.m.map(x => x * k); }
export function itemCost(S, id, q) { const f = F(S, id); if (!f) return 0; return priceOf(S, id) * q / f.pack; }
function roundQty(S, id, q) {
  const f = F(S, id); if (!f) return q;
  if (f.u === 'g' || f.u === 'ml') { const step = q < 20 ? 1 : q < 150 ? 5 : 10; return Math.max(step, Math.round(q / step) * step); }
  if (f.u === 'loaf') return Math.max(0.5, Math.round(q * 2) / 2);
  if (f.u === 'scoop' || f.u === 'egg') return Math.max(1, Math.round(q));
  return Math.round(q * 10) / 10;
}
// Per-portion items after scaling the flex items by factor f.
export function scaled(S, r, f) { return r.items.map(([id, q, flex]) => [id, flex ? roundQty(S, id, q * f) : q, !!flex]); }
export function recipeTotals(S, r, f = 1) {
  let t = [0, 0, 0, 0], cost = 0;
  for (const [id, q] of scaled(S, r, f)) { const m = itemMacros(S, id, q); t = t.map((v, i) => v + m[i]); cost += itemCost(S, id, q); }
  return { kcal: t[0], p: t[1], c: t[2], f: t[3], cost };
}
function split(S, r) { let fixed = 0, flex = 0; for (const [id, q, fl] of r.items) { const k = itemMacros(S, id, q)[0]; if (fl) flex += k; else fixed += k; } return { fixed, flex }; }

/* ---------- Schedule ---------- */
export const isHome = (S, k) => S.profile.homeDays.includes(dow(k));
export const isCookDay = (S, k) => isHome(S, k) && S.profile.cookDays.includes(dow(k));
export function mealsOn(S, k) {
  if (!isHome(S, k)) return [];
  const d = dow(k);
  return MEALS.filter(m => !(S.profile.awayMeals || []).includes(d + ':' + m));
}
export function shopDayOnOrBefore(S, k) { let d = k; for (let i = 0; i < 7; i++) { if (dow(d) === S.profile.shopDay) return d; d = addDays(d, -1); } return k; }
export function shopDayOnOrAfter(S, k) { let d = k; for (let i = 0; i < 7; i++) { if (dow(d) === S.profile.shopDay) return d; d = addDays(d, 1); } return k; }
export const cycleDates = c => [...Array(CYCLE_DAYS)].map((_, i) => addDays(c.start, i));
export function cycleFor(S, k) { return (S.meal.cycles || []).find(c => k >= c.start && diffDays(c.start, k) < CYCLE_DAYS) || null; }

/* ---------- Generation ---------- */
function pools(S) {
  const all = allRecipes(S).filter(r => !isHidden(S, r.id));
  return {
    // In 1-dish mode the dish is also that night's dinner, so it must suit both.
    batchLunch: all.filter(r => r.kind === 'batch' && !isBig(r) && r.slots.includes('lunch') && ((S.profile.cookMode || 'one') === 'two' || r.slots.includes('dinner'))),
    batchDinner: all.filter(r => r.kind === 'batch' && !isBig(r) && r.slots.includes('dinner')),
    big: all.filter(r => r.kind === 'batch' && isBig(r) && r.slots.includes('lunch') && r.slots.includes('dinner')),
    breakfast: all.filter(r => r.slots.includes('breakfast')),
    snack: all.filter(r => r.slots.includes('snack')),
    nocookLunch: all.filter(r => r.kind === 'nocook' && r.slots.includes('lunch')),
    nocookDinner: all.filter(r => r.kind === 'nocook' && r.slots.includes('dinner'))
  };
}

// Which cook session (index) feeds a lunch or dinner on date d, or -1.
function owner(cooks, d, meal) {
  let best = -1;
  cooks.forEach((c, i) => { if (c.date < d || (c.date === d && meal === 'dinner')) best = i; });
  return best;
}

export function generateCycle(S, start, seed, prev) {
  const rand = rng(seed), P = pools(S), mode = S.profile.cookMode || 'one';
  const dates = [...Array(CYCLE_DAYS)].map((_, i) => addDays(start, i));
  const cooks = dates.filter(d => isCookDay(S, d)).map(date => ({ date }));
  const used = new Set(), prevUsed = new Set(prev ? (prev.cooks || []).flatMap(c => [c.a, c.b]).filter(Boolean) : []);
  // How many days each cook session has to last.
  // How many days each cook session has to last (anything older than 3 days becomes a no-cook meal anyway).
  const span = i => { let m = 0; for (const d of dates) for (const meal of ['lunch', 'dinner']) if (mealsOn(S, d).includes(meal) && owner(cooks, d, meal) === i) { const a = diffDays(cooks[i].date, d); if (a <= 3) m = Math.max(m, a); } return m; };
  const choose = (pool, i, avoidBase) => {
    const need = span(i);
    const ranked = shuffle(pool, rand).filter(r => (r.keeps || 3) >= need)
      .sort((x, y) => (used.has(x.id) - used.has(y.id)) || (prevUsed.has(x.id) - prevUsed.has(y.id)) || ((avoidBase.includes(x.base)) - (avoidBase.includes(y.base))));
    const r = ranked[0]; if (r) used.add(r.id); return r ? r.id : null;
  };
  const bigIdx = hasBigNight(S, start) && P.big.length ? 0 : -1;
  cooks.forEach((c, i) => {
    const prevBase = i > 0 ? [recipe(S, cooks[i - 1].a)?.base, recipe(S, cooks[i - 1].b)?.base] : [];
    if (i === bigIdx) { c.big = true; c.a = choose(P.big, i, prevBase) || choose(P.batchLunch, i, prevBase); }
    else c.a = choose(P.batchLunch, i, prevBase);
    if (mode === 'two') c.b = choose(P.batchDinner, i, prevBase.concat([recipe(S, c.a)?.base]));
  });
  const rot = (pool) => { const order = shuffle(pool, rand).map(r => r.id); let i = 0; return (avoid = []) => { for (let t = 0; t < order.length; t++) { const id = order[(i + t) % order.length]; if (!avoid.includes(id) || t === order.length - 1) { i = i + t + 1; return id; } } return order[0]; }; };
  const nextB = rot(P.breakfast), nextS = rot(P.snack), nextNL = rot(P.nocookLunch), nextND = rot(P.nocookDinner);
  const days = {};
  let lastB = null;
  for (const d of dates) {
    const meals = mealsOn(S, d); if (!meals.length) continue;
    const day = days[d] = {};
    for (const meal of meals) {
      if (meal === 'breakfast') { day.breakfast = { rid: nextB([lastB]) }; lastB = day.breakfast.rid; }
      else if (meal === 'snack') day.snack = { rid: nextS() };
      else {
        const i = owner(cooks, d, meal);
        const cr = i >= 0 ? recipe(S, meal === 'dinner' && mode === 'two' ? cooks[i].b : cooks[i].a) : null;
        const fresh = cr && diffDays(cooks[i].date, d) <= (cr.keeps || 3);
        if (fresh && meal === 'lunch') day.lunch = { cook: i, role: 'a' };
        else if (fresh && meal === 'dinner' && (mode === 'two' || cooks[i].date === d)) day.dinner = { cook: i, role: mode === 'two' ? 'b' : 'a' };
        else {
          const bBase = recipe(S, day.breakfast?.rid)?.base;
          const pick = meal === 'lunch' ? nextNL() : nextND(P.nocookDinner.filter(r => r.base === bBase).map(r => r.id));
          day[meal] = { rid: pick };
        }
      }
    }
  }
  return { start, seed, cooks, days, have: {}, created: new Date().toISOString() };
}

// Resolve a slot to its recipe id.
export const slotRid = (c, slot) => slot ? (slot.rid || c.cooks[slot.cook]?.[slot.role]) : null;

/* ---------- Scaling to the calorie target ---------- */
// One factor for the whole cycle, so batch-cooked portions are identical every day they're eaten.
export function flexFactor(S, c) {
  let fixed = 0, flex = 0, target = 0;
  for (const day of Object.values(c.days)) {
    for (const [meal, slot] of Object.entries(day)) { const r = recipe(S, slotRid(c, slot)); if (!r) continue; const s = split(S, r); fixed += s.fixed; flex += s.flex; target += S.profile.kcal * MEAL_SHARE[meal]; }
  }
  if (!flex) return 1;
  const f = (target - fixed) / flex;
  return Math.max(0.5, Math.min(2, f));
}
export function dayPlan(S, c, d, f = flexFactor(S, c)) {
  const day = c.days[d]; if (!day) return null;
  const meals = [];
  let t = { kcal: 0, p: 0, c: 0, f: 0, cost: 0 }, target = 0;
  for (const meal of MEALS) {
    const slot = day[meal]; if (!slot) continue;
    const r = recipe(S, slotRid(c, slot)); if (!r) continue;
    const tot = recipeTotals(S, r, f);
    for (const k of Object.keys(t)) t[k] += tot[k];
    target += S.profile.kcal * MEAL_SHARE[meal];
    meals.push({ meal, slot, r, tot, cookDate: slot.cook != null ? c.cooks[slot.cook].date : null });
  }
  return { meals, t, target: Math.round(target), proteinTarget: Math.round(S.profile.protein * target / S.profile.kcal) };
}

/* ---------- Cook sessions ---------- */
export function cookSessions(S, c, f = flexFactor(S, c)) {
  return c.cooks.map((ck, i) => {
    const portions = { a: 0, b: 0 }, eats = { a: [], b: [] };
    let boil = 0;
    for (const [d, day] of Object.entries(c.days)) {
      for (const [meal, slot] of Object.entries(day)) {
        if (slot.cook === i) { portions[slot.role]++; eats[slot.role].push([d, meal]); }
        // Boiled eggs: for this session's dishes, and for no-cook meals until the next cook.
        const r = recipe(S, slotRid(c, slot));
        if (r?.boil && (slot.cook === i || (slot.cook == null && owner(c.cooks, d, meal) === i))) boil += r.boil;
      }
    }
    const dishes = ['a', 'b'].filter(k => ck[k] && portions[k]).map(k => {
      const r = recipe(S, ck[k]);
      const per = scaled(S, r, f);
      return { role: k, r, portions: portions[k], eats: eats[k], per, total: per.map(([id, q]) => [id, Math.round(q * portions[k] * 10) / 10]) };
    });
    return { i, date: ck.date, big: !!ck.big, dishes, boil, boxes: sum(dishes.map(x => x.portions)) - (dishes.some(x => x.eats.some(([d]) => d === ck.date)) ? 1 : 0), minutes: Math.max(0, ...dishes.map(x => x.r.time)) + (dishes.length > 1 ? 20 : 0) };
  });
}
// Eggs to boil before the first cook day (on the shop day).
export function preCookBoil(S, c) {
  let n = 0;
  for (const [d, day] of Object.entries(c.days)) for (const [meal, slot] of Object.entries(day)) {
    const r = recipe(S, slotRid(c, slot));
    if (r?.boil && slot.cook == null && owner(c.cooks, d, meal) === -1) n += r.boil;
  }
  return n;
}

/* ---------- Shopping list ---------- */
export function shoppingList(S, c, f = flexFactor(S, c)) {
  const need = {}, wk1 = {};
  const mid = addDays(c.start, 7);
  for (const [d, day] of Object.entries(c.days)) for (const slot of Object.values(day)) {
    const r = recipe(S, slotRid(c, slot)); if (!r) continue;
    for (const [id, q] of scaled(S, r, f)) { need[id] = (need[id] || 0) + q; if (d < mid) wk1[id] = (wk1[id] || 0) + q; }
  }
  const rows = Object.entries(need).map(([id, q]) => {
    const fd = F(S, id); if (!fd) return null;
    const have = !!c.have?.[id];
    const packs = have ? 0 : Math.ceil(q / fd.pack - 1e-9);
    const shortLife = (fd.keeps || 99) < 12;
    return { id, f: fd, q, w1: wk1[id] || 0, packs, cost: packs * priceOf(S, id), have, shortLife };
  }).filter(Boolean);
  const order = ['freezer', 'fridge', 'fresh', 'pantry'];
  rows.sort((a, b) => order.indexOf(a.f.where) - order.indexOf(b.f.where) || a.f.n.localeCompare(b.f.n));
  return { rows, total: sum(rows.map(r => r.cost)) };
}
export function cycleCost(S, c, f = flexFactor(S, c)) {
  let cost = 0, n = 0;
  for (const d of Object.keys(c.days)) { const dp = dayPlan(S, c, d, f); cost += dp.t.cost; n++; }
  return { cost, perDay: n ? cost / n : 0, days: n };
}
export function qtyLabel(S, id, q) {
  const f = F(S, id); if (!f) return String(q);
  if (f.u === 'g' || f.u === 'ml') return q >= 1000 ? (Math.round(q / 100) / 10) + (f.u === 'g' ? ' kg' : ' L') : Math.round(q) + ' ' + f.u;
  const v = Math.round(q * 10) / 10, frac = { 0.5: '½', 0.25: '¼', 0.3: '⅓', 0.4: '0.4' }[v];
  if (f.u === 'can') return (frac || v) + (v > 1 ? ' cans' : ' can');
  if (f.u === 'egg') return v + (v === 1 ? ' egg' : ' eggs');
  if (f.u === 'loaf') return (frac || v) + (v > 1 ? ' loaves' : ' loaf');
  return v + ' ' + f.u + (v > 1 ? 's' : '');
}
export function itemLabel(S, id, q) { const f = F(S, id); if (!f) return id; const n = f.n.replace(/ *\(.*\)/, '').replace(/, .*/, '').toLowerCase(); return f.u === 'egg' ? qtyLabel(S, id, q) : qtyLabel(S, id, q) + ' ' + n; }
export const foodsList = S => FOODS.concat(Object.values(S.customFoods || {}));
