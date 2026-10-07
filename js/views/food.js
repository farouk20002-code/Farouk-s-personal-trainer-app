import { app } from '../store.js';
import { ui, today, check } from '../ui.js';
import { esc, addDays, fmtDate, fmtShort, DOWL, DOW, dow } from '../util.js';
import { CREATINE_MONTH, PANTRY, KIT } from '../foods.js';
import { isHidden, isBig, cycleFor, cycleDates, dayPlan, flexFactor, cookSessions, preCookBoil, shoppingList, cycleCost, qtyLabel, itemLabel, recipe, recipeTotals, scaled, allRecipes, priceOf, foodsList, MEAL_LABEL, shopDayOnOrAfter, shopDayOnOrBefore, CYCLE_DAYS } from '../mealplan.js';
import { EAT_OUT } from './today.js';
import { sec, cell, ICON, chev } from './ios.js';

const SUBS = [['plan', 'Plan'], ['cook', 'Cook'], ['shop', 'Shop'], ['recipes', 'Recipes'], ['budget', 'Budget']];
const KIND = { batch: 'Weeknight batch', big: 'Big cook night', fresh: 'Breakfast, made fresh', nocook: 'No cook' };
const MEAL_ICON = { breakfast: ['sunrise', 'orange'], lunch: ['box', 'blue'], snack: ['leaf', 'green'], dinner: ['moon', 'indigo'] };
const food = (S, id) => foodsList(S).find(f => f.id === id);
const ar = f => f?.ar ? `<span class="ar" lang="ar" dir="rtl">${esc(f.ar)}</span>` : '';

export function activeCycle(S) {
  const t = today();
  return cycleFor(S, t) || (S.meal.cycles || []).filter(c => c.start > t).sort((a, b) => a.start < b.start ? -1 : 1)[0] || null;
}
export function nextCycleStart(S) {
  const t = today(), c = activeCycle(S);
  if (c) return addDays(c.start, CYCLE_DAYS);
  return t < S.profile.startDate ? shopDayOnOrAfter(S, t) : shopDayOnOrBefore(S, t);
}
const nextCycle = (S, c) => c ? (S.meal.cycles || []).find(x => x.start === addDays(c.start, CYCLE_DAYS)) : null;

export function vFood() {
  const S = app.S, sub = ui.foodTab;
  let out = `<h1 class="lt">Food</h1>
  <div class="segctl" role="tablist">${SUBS.map(([k, l]) => `<button role="tab" aria-selected="${k === sub}" data-act="food" data-sub="${k}" class="${k === sub ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  out += ({ plan: subPlan, cook: subCook, shop: subShop, recipes: subRecipes, budget: subBudget }[sub] || subPlan)(S);
  return out;
}
const empty = (title, text, btn) => `<div class="emptyst"><div class="emptyic">${ICON.fork}</div><h2>${title}</h2><p>${text}</p>${btn}</div>`;

/* ---------- Plan ---------- */
function mealCell(S, c, d, m) {
  const [ic, col] = MEAL_ICON[m.meal];
  const note = m.cookDate ? `from ${DOWL[dow(m.cookDate)]}'s cook` : m.r.kind === 'nocook' ? 'no cook' : 'made fresh';
  return `<div class="cell"><span class="ic ${col}">${ICON[ic]}</span><button class="cbody" data-act="recipe" data-id="${m.r.id}"><span class="ct">${esc(m.r.n)}</span><span class="cs">${MEAL_LABEL[m.meal]} · ${Math.round(m.tot.kcal)} kcal · ${note}</span></button><button class="iconbtn2" data-act="swapmeal" data-c="${c.start}" data-d="${d}" data-m="${m.meal}" aria-label="Swap ${MEAL_LABEL[m.meal]}">${ICON.swap}</button></div>`;
}
function subPlan(S) {
  const t = today(), c = activeCycle(S);
  if (!c) {
    const st = nextCycleStart(S);
    return empty('Plan two weeks of food', `Recipes picked and scaled to ${S.profile.kcal} kcal, cook nights on ${S.profile.cookDays.map(d => DOWL[d]).join(' and ')}, one shopping list. Starts ${fmtDate(st)}.`, `<button class="btn fill" data-act="gencycle" data-start="${st}">Make My Plan</button>`);
  }
  const f = flexFactor(S, c), cost = cycleCost(S, c, f), nx = nextCycle(S, c);
  const end = addDays(c.start, CYCLE_DAYS - 1);
  const nextCook = c.cooks.find(k => k.date >= t);
  let out = `<div class="summary3"><div><b>${fmtShort(c.start)}–${fmtShort(end)}</b><span>This plan</span></div><div><b>${cost.perDay.toFixed(0)} SAR</b><span>Per day</span></div><div><b>${nextCook ? (nextCook.date === t ? 'Tonight' : DOW[dow(nextCook.date)]) : '–'}</b><span>Next cook</span></div></div>`;
  const summary = out; out = '';
  let pastHtml = '', pastN = 0;
  for (const d of cycleDates(c)) {
    const dp = dayPlan(S, c, d, f);
    if (!dp) continue;
    const cook = c.cooks.find(k => k.date === d);
    const head = `${d === t ? 'Today' : DOWL[dow(d)]} · ${fmtShort(d)}`;
    const trail = `${Math.round(dp.t.kcal)} kcal · ${Math.round(dp.t.p)} g protein`;
    let rows = dp.meals.map(m => mealCell(S, c, d, m)).join('');
    if (cook) rows += cell({ icon: ICON.flame, color: cook.big ? 'red' : 'orange', title: cook.big ? 'Big cook night' : 'Cook tonight', sub: 'Open the cook plan', act: 'data-act="food" data-sub="cook"', chevron: true });
    const html = sec(head, rows, null, trail, d === t ? 'today' : '');
    if (d < t) { pastHtml += html; pastN++; } else out += html;
  }
  out = summary + (pastN ? `<details class="earlier"><summary class="sechead"><span>Earlier this plan</span><span class="trail">${pastN} day${pastN > 1 ? 's' : ''} ›</span></summary>${pastHtml}</details>` : '') + out;
  out += `<div class="stack">${nx ? `<p class="foot">Next plan ready from ${fmtDate(nx.start)}.</p>` : `<button class="btn fill" data-act="gencycle" data-start="${addDays(c.start, CYCLE_DAYS)}">Plan the Next 2 Weeks</button>`}<button class="btn tinted" data-act="regen" data-c="${c.start}">Pick New Recipes</button></div>
  <p class="foot">Fridays, Saturdays and Thursday dinner are away days and aren't planned.</p>`;
  return out;
}

/* ---------- Cook ---------- */
function cookCard(S, s, t) {
  const when = s.date === t ? 'Tonight' : `${DOWL[dow(s.date)]} · ${fmtShort(s.date)}`;
  let out = `<article class="cookcard ${s.big ? 'big' : ''}"><div class="eyebrow">${s.big ? 'Big cook night · ' : ''}${when}</div><h2 class="ctitle">${s.dishes.map(x => esc(x.r.n)).join(' + ')}</h2>
  <div class="chips"><span class="chip2">${ICON.clock} ${s.minutes} min</span><span class="chip2">${ICON.box} ${s.boxes} box${s.boxes === 1 ? '' : 'es'}</span>${s.boil ? `<span class="chip2">${ICON.egg} Boil ${s.boil} eggs</span>` : ''}</div>`;
  for (const x of s.dishes) {
    out += `${s.dishes.length > 1 ? `<h3 class="dish">${esc(x.r.n)}</h3>` : ''}<p class="eats">${x.portions} portions for ${x.eats.map(([d, m]) => `${DOW[dow(d)]} ${m}`).join(', ')}</p>
    <div class="list inset">${x.total.map(([id, q], i) => `<div class="cell"><div class="cbody static"><span class="ct">${esc(food(S, id)?.n || id)}</span>${ar(food(S, id))}</div><div class="ctrail"><b>${qtyLabel(S, id, q)}</b><span>${qtyLabel(S, id, x.per[i][1])} per box</span></div></div>`).join('')}</div>
    <ol class="steps2">${x.r.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>`;
  }
  const d = S.daily[s.date] || {};
  out += `<p class="foot">Cool before the lid goes on. Fridge within 2 hours. Reheat until steaming hot.</p>
  ${s.date === t ? (d.cooked ? `<div class="donepill">${ICON.check} Cooked</div>` : `<button class="btn fill" data-act="cooked" data-big="${s.big ? 1 : 0}">Done Cooking</button>`) : ''}</article>`;
  return out;
}
function subCook(S) {
  const c = activeCycle(S);
  if (!c) return empty('No cook nights yet', 'Make your two-week plan and your cook nights appear here with exact quantities.', `<button class="btn fill" data-act="food" data-sub="plan">Go to Plan</button>`);
  const t = today(), f = flexFactor(S, c), sessions = cookSessions(S, c, f).filter(s => s.dishes.length);
  const upcoming = sessions.filter(s => s.date >= t), past = sessions.filter(s => s.date < t);
  let out = '';
  const pre = preCookBoil(S, c);
  if (pre && c.start >= t) out += `<p class="foot">On shopping day, boil ${pre} eggs for the no-cook meals.</p>`;
  if (upcoming.length) out += cookCard(S, upcoming[0], t);
  const rest = upcoming.slice(1);
  const nx = nextCycle(S, c);
  const later = rest.concat(nx ? cookSessions(S, nx).filter(s => s.dishes.length) : []);
  if (later.length) out += sec('Coming up', later.map(s => cell({ icon: ICON.flame, color: s.big ? 'red' : 'orange', title: s.dishes.map(x => x.r.n).join(' + '), sub: `${DOWL[dow(s.date)]} ${fmtShort(s.date)} · ${s.minutes} min${s.big ? ' · big night' : ''}`, act: `data-act="recipe" data-id="${s.dishes[0].r.id}"`, chevron: true })).join(''));
  if (past.length) out += sec('Done this plan', past.map(s => cell({ icon: ICON.check, color: 'gray', title: s.dishes.map(x => x.r.n).join(' + '), sub: `${DOWL[dow(s.date)]} ${fmtShort(s.date)}`, act: `data-act="recipe" data-id="${s.dishes[0].r.id}"`, chevron: true })).join(''));
  return out;
}

/* ---------- Shop ---------- */
function subShop(S) {
  const t = today(); let c = activeCycle(S);
  const nx = nextCycle(S, c);
  if (nx && (t >= addDays(nx.start, -3))) c = nx;
  if (!c) return empty('Nothing to buy yet', 'Make your two-week plan and the shopping list builds itself, with Arabic names for every item.', `<button class="btn fill" data-act="food" data-sub="plan">Go to Plan</button>`);
  const f = flexFactor(S, c), list = shoppingList(S, c, f), first = (S.meal.cycles || [])[0]?.start === c.start;
  const where = { freezer: 'Freezer', fridge: 'Fridge', fresh: 'Fresh', pantry: 'Cupboard' };
  c.got = c.got || {};
  const toBuy = list.rows.filter(r => !r.have), got = toBuy.filter(r => c.got[r.id]).length;
  let out = `<div class="shophead"><div><div class="eyebrow">Shop ${fmtDate(c.start)}</div><div class="bignum">${Math.round(list.total)} <small>SAR</small></div></div><div class="ringmini" style="--p:${toBuy.length ? got / toBuy.length : 0}"><span>${got}/${toBuy.length}</span></div></div>
  <p class="foot">The right side is exactly what goes in the basket. "Need" is what your meals use, so leftovers carry over.</p>`;
  for (const w of ['freezer', 'fridge', 'fresh', 'pantry']) {
    const rows = list.rows.filter(r => r.f.where === w); if (!rows.length) continue;
    out += sec(where[w], rows.map(r => {
      const on = !!c.got[r.id];
      return `<div class="cell shop ${on ? 'got' : ''} ${r.have ? 'have' : ''}"><button class="rcheck ${on ? 'on' : ''}" data-act="gotit" data-c="${c.start}" data-id="${r.id}" aria-label="${esc(r.f.n)} in the basket" aria-pressed="${on}">${on ? ICON.checkSm : ''}</button>
      <div class="cbody static"><span class="ct">${esc(r.f.n)}</span>${ar(r.f)}${r.f.desc ? `<span class="cs">${esc(r.f.desc)}</span>` : ''}<span class="cs">Need ${qtyLabel(S, r.id, r.q)}${r.shortLife && r.q > r.w1 ? `, ${qtyLabel(S, r.id, r.w1)} in week 1` : ''}</span></div>
      <div class="ctrail">${r.have ? '<b class="muted2">At home</b>' : `<b>${r.packs} × ${esc(r.f.pl)}</b><span>${Math.round(r.cost)} SAR</span>`}<button class="linkbtn2" data-act="haveit" data-c="${c.start}" data-id="${r.id}">${r.have ? 'Need it' : 'Have it'}</button></div></div>`;
    }).join(''));
  }
  if (list.rows.some(r => r.id === 'veg')) out += `<p class="foot">Tip: a second bag of frozen mixed vegetables (~10 SAR) and a handful in each lunch box adds fibre and keeps you full.</p>`;
  const shortOnes = list.rows.filter(r => r.shortLife && r.q > r.w1 && !r.have);
  if (shortOnes.length) out += `<p class="foot">${shortOnes.map(r => esc(r.f.n.split(',')[0])).join(', ')} last about a week. Use the oldest first or top up on the way home in week 2. Freeze half the bread.</p>`;
  if (first) out += sec('First shop only', PANTRY.concat(KIT).map(([n, p, a]) => `<div class="cell"><div class="cbody static"><span class="ct">${esc(n)}</span>${a ? `<span class="ar" lang="ar" dir="rtl">${esc(a)}</span>` : ''}</div><div class="ctrail"><span>${p ? '~' + p + ' SAR' : ''}</span></div></div>`).join(''), `Plus creatine monohydrate, about ${CREATINE_MONTH} SAR a month.`);
  return out;
}

/* ---------- Recipes ---------- */
function subRecipes(S) {
  const all = allRecipes(S);
  let out = `<p class="foot">Tap a dish to see it. Dishes you remove never get planned again.</p>`;
  for (const kind of ['batch', 'big', 'fresh', 'nocook']) {
    const list = all.filter(r => kind === 'big' ? r.kind === 'batch' && isBig(r) : r.kind === kind && !(kind === 'batch' && isBig(r)));
    out += sec(KIND[kind], list.map(r => {
      const tt = recipeTotals(S, r, 1), hidden = isHidden(S, r.id);
      return cell({ icon: ICON[kind === 'big' ? 'flame' : kind === 'fresh' ? 'sunrise' : kind === 'nocook' ? 'leaf' : 'box'], color: hidden ? 'gray' : kind === 'big' ? 'red' : kind === 'fresh' ? 'orange' : kind === 'nocook' ? 'green' : 'blue', title: r.n + (r.custom ? ' · from Claude' : ''), sub: hidden ? 'Removed from rotation' : `${Math.round(tt.kcal)} kcal · ${Math.round(tt.p)} g protein${r.time ? ` · ${r.time} min` : ''}`, act: `data-act="recipe" data-id="${r.id}"`, chevron: true, dim: hidden });
    }).join(''));
  }
  out += `<p class="foot">Want new dishes? Coach › New recipes from Claude.</p>`;
  return out;
}

/* ---------- Budget ---------- */
function subBudget(S) {
  const P = S.profile, c = activeCycle(S), cost = c ? cycleCost(S, c) : null;
  const homeDaysMonth = Math.round(P.homeDays.length * 30 / 7);
  const planMonth = cost ? cost.perDay * homeDaysMonth : 0, left = P.budget - planMonth - CREATINE_MONTH;
  const row = (l, v, cls = '') => `<div class="cell"><div class="cbody static"><span class="ct">${l}</span></div><div class="ctrail"><b class="${cls}">${v}</b></div></div>`;
  let out = sec('This month', `<div class="cell"><label class="cbody static" for="bud"><span class="ct">Food budget</span></label><div class="ctrail"><input class="inline" id="bud" inputmode="numeric" data-prof="budget" value="${P.budget}"> <span>SAR</span></div></div>`
    + (cost ? row(`Home food, ${homeDaysMonth} days`, Math.round(planMonth) + ' SAR') : row('Home food', 'Make a plan first'))
    + row('Creatine', CREATINE_MONTH + ' SAR') + row('Left for eating out', Math.round(left) + ' SAR', left < 0 ? 'neg' : 'pos'),
    left < 0 ? 'Over budget. Swap tuna meals for eggs or ful, or update prices.' : `About ${Math.max(0, Math.floor(left / 35))} cheap meals out a month. The first shop costs more: rice, oil and spices last months.`);
  out += sec('Eating out', EAT_OUT.map(([n, k]) => row(esc(n), `~${k} kcal`, k >= 1000 ? 'neg' : '')).join(''), 'Rough numbers. Log meals out in Today so the check-in knows.');
  const ranked = foodsList(S).map(f => ({ f, ppr: f.m[1] * (f.pack / f.b) / (priceOf(S, f.id) || 1) })).sort((a, b) => b.ppr - a.ppr);
  out += sec('Prices · best protein per riyal first', ranked.map(({ f, ppr }) => `<div class="cell"><div class="cbody static"><span class="ct">${esc(f.n)}</span><span class="cs">${esc(f.pl)} · ${ppr.toFixed(1)} g protein per SAR</span></div><div class="ctrail"><input class="inline" inputmode="decimal" data-price="${f.id}" value="${priceOf(S, f.id)}" aria-label="${esc(f.n)} price"></div></div>`).join(''), 'Edit a price and every plan and total updates.');
  out += sec('Supplements', `<div class="cell"><div class="cbody static"><span class="ct">Creatine monohydrate</span><span class="cs">5 g every day, any time. Plain monohydrate only.</span></div></div><div class="cell"><div class="cbody static"><span class="ct">Whey</span><span class="cs">Only if it beats your foods on protein per riyal.</span></div></div><div class="cell"><div class="cbody static"><span class="ct">Skip</span><span class="cs">Fat burners, BCAAs, test boosters.</span></div></div>`);
  return out;
}

/* ---------- Recipe detail ---------- */
export function vRecipe() {
  const S = app.S, r = recipe(S, ui.route.id);
  if (!r) return `<button class="navback" data-act="back">${chev('left')} Back</button><p>Recipe not found.</p>`;
  const c = activeCycle(S), f = c ? flexFactor(S, c) : 1, n = ui.route.n || 1;
  const per = scaled(S, r, f), tt = recipeTotals(S, r, f);
  const kind = KIND[r.kind === 'batch' && isBig(r) ? 'big' : r.kind];
  return `<button class="navback" data-act="back">${chev('left')} Food</button>
  <div class="eyebrow" style="margin-top:6px">${kind}</div><h1 class="lt" style="margin-top:2px">${esc(r.n)}</h1>
  <div class="summary3"><div><b>${Math.round(tt.kcal)}</b><span>kcal / portion</span></div><div><b>${Math.round(tt.p)} g</b><span>Protein</span></div><div><b>${r.time || '–'}<small> min</small></b><span>${esc(r.tool || 'Time')}</span></div></div>
  <div class="sechead"><span>Ingredients</span><div class="segctl small">${[1, 2, 3].map(k => `<button data-act="portions" data-n="${k}" class="${k === n ? 'on' : ''}" aria-label="${k} portions">×${k}</button>`).join('')}</div></div>
  <div class="list">${per.map(([id, q, flex]) => `<div class="cell"><div class="cbody static"><span class="ct">${esc(food(S, id)?.n || id)}</span>${ar(food(S, id))}${flex ? '<span class="cs">Scaled to your calories</span>' : ''}</div><div class="ctrail"><b>${qtyLabel(S, id, Math.round(q * n * 10) / 10)}</b></div></div>`).join('')}</div>
  <p class="foot">Plus salt, pepper and the spices in the steps. Medium spice at most.${r.keeps ? ` Keeps ${r.keeps} days in the fridge.` : ''}</p>
  <div class="sechead"><span>Steps</span></div><ol class="steps2 card">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  <div class="stack">${isHidden(S, r.id) ? `<button class="btn tinted" data-act="hiderecipe" data-id="${r.id}">Put Back in Rotation</button>` : `<button class="btn plain destructive" data-act="hiderecipe" data-id="${r.id}">Don't Plan This Dish Again</button>`}</div>`;
}
export { check, itemLabel };
