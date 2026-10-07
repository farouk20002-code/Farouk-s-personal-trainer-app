import { app } from '../store.js';
import { ui, today, stat, check } from '../ui.js';
import { esc, addDays, fmtDate, fmtShort, DOWL, DOW, dow } from '../util.js';
import { CREATINE_MONTH, PANTRY, KIT } from '../foods.js';
import { isHidden, cycleFor, cycleDates, dayPlan, flexFactor, cookSessions, preCookBoil, shoppingList, cycleCost, qtyLabel, itemLabel, recipe, recipeTotals, scaled, allRecipes, priceOf, foodsList, MEAL_LABEL, shopDayOnOrAfter, shopDayOnOrBefore, CYCLE_DAYS } from '../mealplan.js';
import { EAT_OUT } from './today.js';

const SUBS = [['plan', '2 weeks'], ['cook', 'Cook'], ['shop', 'Shop'], ['recipes', 'Recipes'], ['budget', 'Budget']];
const KIND = { batch: 'Batch cook', fresh: 'Fresh, quick', nocook: 'No cook' };

// The cycle the Food tab is looking at: the one covering today, else the next upcoming one.
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
  let out = `<h2 style="margin-top:4px">Food</h2>
  <div class="targets"><div class="target"><b>${S.profile.kcal}</b><span>calories</span></div><div class="target"><b>${S.profile.protein} g</b><span>protein, min</span></div><div class="target"><b>5 g</b><span>creatine</span></div></div>
  <div class="subtabs">${SUBS.map(([k, l]) => `<button data-act="food" data-sub="${k}" class="${k === sub ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  out += ({ plan: subPlan, cook: subCook, shop: subShop, recipes: subRecipes, budget: subBudget }[sub] || subPlan)(S);
  return out;
}

function mealLine(S, c, d, m) {
  return `<div class="mealrow2"><button class="mealrow" data-act="recipe" data-id="${m.r.id}"><span class="small muted">${MEAL_LABEL[m.meal]}</span><span><strong>${esc(m.r.n)}</strong>${m.cookDate ? ` <span class="small muted">· from ${DOW[dow(m.cookDate)]}'s cook</span>` : m.r.kind === 'nocook' ? ' <span class="small muted">· no cook</span>' : ''}</span><span class="small muted">${Math.round(m.tot.kcal)}</span></button><button class="btn sm ghost" data-act="swapmeal" data-c="${c.start}" data-d="${d}" data-m="${m.meal}" aria-label="Swap ${MEAL_LABEL[m.meal]}">⇄</button></div>`;
}

function subPlan(S) {
  const t = today(), c = activeCycle(S);
  if (!c) {
    const st = nextCycleStart(S);
    return `<div class="block"><h3>Your 2-week meal plan</h3><p>The app picks recipes for 2 weeks, scales them to your calories, plans your cook nights (${S.profile.cookDays.map(d => DOWL[d]).join(' and ')}) and builds one shopping list.</p>
    <p class="small muted">Starts ${fmtDate(st)} (shopping day). Change the days in Settings.</p><button class="btn primary block-w" data-act="gencycle" data-start="${st}">Make my 2-week plan</button></div>`;
  }
  const f = flexFactor(S, c), cost = cycleCost(S, c, f), nx = nextCycle(S, c);
  const end = addDays(c.start, CYCLE_DAYS - 1);
  let out = `<div class="block"><div class="row between"><h3 style="margin:0">${fmtShort(c.start)} – ${fmtShort(end)}</h3><span class="small muted">~${cost.perDay.toFixed(0)} SAR/day</span></div>
  <p class="small muted" style="margin:6px 0 0">Tap a meal for the recipe, ⇄ to swap it. Cook nights: ${c.cooks.map(k => DOW[dow(k.date)] + ' ' + fmtShort(k.date)).join(', ')}.</p></div>`;
  for (const d of cycleDates(c)) {
    const dp = dayPlan(S, c, d, f);
    if (!dp) { out += `<div class="dayhead muted small">${DOWL[dow(d)]} ${fmtShort(d)} · away</div>`; continue; }
    const cook = c.cooks.find(k => k.date === d);
    out += `<div class="block tight ${d === t ? 'todayb' : ''}"><div class="row between"><h3 style="margin:0">${DOWL[dow(d)]} <span class="small muted">${fmtShort(d)}</span></h3><span class="small ${dp.t.p < dp.proteinTarget - 10 ? 'warn' : 'muted'}">${Math.round(dp.t.kcal)} kcal · ${Math.round(dp.t.p)} g</span></div>
    ${cook ? `<p class="small" style="margin:4px 0"><strong>Cook tonight.</strong> <button class="linkbtn" data-act="food" data-sub="cook">See the cook plan</button></p>` : ''}
    ${dp.meals.map(m => mealLine(S, c, d, m)).join('')}</div>`;
  }
  out += `<div class="row wrapflex" style="margin-top:8px">${nx ? '' : `<button class="btn primary" data-act="gencycle" data-start="${addDays(c.start, CYCLE_DAYS)}">Make the next 2 weeks</button>`}<button class="btn ghost" data-act="regen" data-c="${c.start}">New recipes for these 2 weeks</button></div>
  <p class="small muted">Away days (Fri, Sat, Thursday dinner) aren't planned. Change that in Settings.</p>`;
  if (nx) out += `<p class="small">Next plan ready from ${fmtDate(nx.start)}.</p>`;
  return out;
}

function cookBlock(S, s, open) {
  return `<details class="block" ${open ? 'open' : ''}><summary>${DOWL[dow(s.date)]} ${fmtShort(s.date)} · ${s.dishes.map(x => esc(x.r.n)).join(' + ') || 'nothing to cook'}</summary>
  <p class="small muted">About ${s.minutes} min. ${s.boxes} box${s.boxes === 1 ? '' : 'es'} for the fridge${s.boil ? `. Also boil ${s.boil} eggs (10 min, cool, keep in the shell)` : ''}.</p>
  ${s.dishes.map(x => `<h3 style="margin-top:12px">${esc(x.r.n)} × ${x.portions} portion${x.portions > 1 ? 's' : ''}</h3>
    <p class="small muted">Eat: ${x.eats.map(([d, m]) => DOW[dow(d)] + ' ' + m).join(', ')}. ${esc(x.r.tool || '')}.</p>
    <table class="t"><tr><th>Ingredient</th><th class="num">Total</th><th class="num">Per box</th></tr>${x.total.map(([id, q], i) => `<tr><td>${esc(foodsList(S).find(f => f.id === id)?.n || id)}</td><td class="num">${qtyLabel(S, id, q)}</td><td class="num">${qtyLabel(S, id, x.per[i][1])}</td></tr>`).join('')}</table>
    <ol class="steps">${x.r.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>`).join('')}
  <p class="small muted" style="margin:8px 0 0">Cool everything before the lid goes on. Into the fridge within 2 hours. Reheat until steaming hot.</p></details>`;
}
function subCook(S) {
  const c = activeCycle(S);
  if (!c) return `<p class="muted">Make your 2-week plan first.</p><button class="btn primary" data-act="food" data-sub="plan">Go to plan</button>`;
  const t = today(), f = flexFactor(S, c), sessions = cookSessions(S, c, f).filter(s => s.dishes.length);
  const pre = preCookBoil(S, c);
  let out = `<p class="small muted">Two cook nights a week, one big batch each. Quantities are already scaled to your calories.</p>`;
  if (pre) out += `<div class="block flat"><p class="small" style="margin:0"><strong>On shopping day:</strong> boil ${pre} eggs for the no-cook meals before the first cook night.</p></div>`;
  const nextIdx = sessions.findIndex(s => s.date >= t);
  sessions.forEach((s, i) => { out += cookBlock(S, s, i === nextIdx); });
  const nx = nextCycle(S, c);
  if (nx) { out += `<h2>Next 2 weeks</h2>`; cookSessions(S, nx).filter(s => s.dishes.length).forEach(s => { out += cookBlock(S, s, false); }); }
  return out;
}

function subShop(S) {
  const t = today(); let c = activeCycle(S);
  const nx = nextCycle(S, c);
  if (nx && (t >= addDays(nx.start, -3))) c = nx;
  if (!c) return `<p class="muted">Make your 2-week plan first.</p><button class="btn primary" data-act="food" data-sub="plan">Go to plan</button>`;
  const f = flexFactor(S, c), list = shoppingList(S, c, f), first = (S.meal.cycles || [])[0]?.start === c.start;
  const where = { freezer: 'Freezer', fridge: 'Fridge', fresh: 'Fresh', pantry: 'Cupboard' };
  c.got = c.got || {};
  let out = `<div class="block"><div class="row between"><h3 style="margin:0">Shop ${fmtDate(c.start)}</h3><b>${Math.round(list.total)} SAR</b></div><p class="small muted" style="margin:6px 0 0">For ${fmtShort(c.start)} – ${fmtShort(addDays(c.start, CYCLE_DAYS - 1))}. Tick items as they go in the basket. Tap "have it" for things you still have at home and the total drops.</p></div>`;
  let cur = '';
  out += `<div class="block">`;
  for (const r of list.rows) {
    if (r.f.where !== cur) { cur = r.f.where; out += `<div class="dayhead small muted">${where[cur]}</div>`; }
    out += `<div class="shoprow ${c.got[r.id] ? 'got' : ''}"><button class="box ${c.got[r.id] ? 'on' : ''}" data-act="gotit" data-c="${c.start}" data-id="${r.id}" aria-label="In the basket">${c.got[r.id] ? '✓' : ''}</button>
      <span><strong>${esc(r.f.n)}</strong><br><span class="small muted">need ${qtyLabel(S, r.id, r.q)}${r.shortLife && r.q > r.w1 ? ` (${qtyLabel(S, r.id, r.w1)} in week 1)` : ''}</span></span>
      <span class="num">${r.have ? '<span class="small muted">at home</span>' : `${r.packs} × ${esc(r.f.pl)}<br><span class="small muted">${Math.round(r.cost)} SAR</span>`}<br><button class="linkbtn" data-act="haveit" data-c="${c.start}" data-id="${r.id}">${r.have ? 'need it' : 'have it'}</button></span></div>`;
  }
  out += `</div>`;
  const shortOnes = list.rows.filter(r => r.shortLife && r.q > r.w1 && !r.have);
  if (shortOnes.length) out += `<div class="block flat"><p class="small" style="margin:0"><strong>Fresh stuff for week 2:</strong> ${shortOnes.map(r => esc(r.f.n.toLowerCase())).join(', ')} only last about a week. Buy the full amount and use the oldest first, or grab week 2's share on the way home any day. Freeze half the bread now.</p></div>`;
  if (first) out += `<details class="block"><summary>First shop only: spices and kit</summary>${PANTRY.concat(KIT).map(([n, p]) => stat(esc(n), p ? '~' + p + ' SAR' : '')).join('')}<p class="small muted" style="margin:8px 0 0">Plus creatine monohydrate (~${CREATINE_MONTH} SAR a month).</p></details>`;
  return out;
}

function subRecipes(S) {
  const all = allRecipes(S);
  let out = `<p class="small muted">Tap a dish, then "Don't plan this dish again" to take it out of the rotation. Everything the planner can choose from. Want new ones? Coach > New recipes: Claude writes them in a format the app can import.</p>`;
  for (const kind of ['batch', 'fresh', 'nocook']) {
    out += `<h2>${KIND[kind]}</h2><div class="block">`;
    for (const r of all.filter(r => r.kind === kind)) {
      const tt = recipeTotals(S, r, 1);
      out += `<div class="mealrow2"><button class="mealrow" data-act="recipe" data-id="${r.id}"><span class="small muted">${r.slots.map(s => MEAL_LABEL[s]).join(', ')}</span><span><strong style="${isHidden(S, r.id) ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(r.n)}</strong>${isHidden(S, r.id) ? ' <span class="small muted">· removed</span>' : ''}${r.custom ? ' <span class="small muted">· from Claude</span>' : ''}</span><span class="small muted">${Math.round(tt.kcal)} kcal · ${Math.round(tt.p)} g</span></button>${r.custom ? `<button class="btn sm ghost" data-act="delrecipe" data-id="${r.id}" aria-label="Delete">✕</button>` : ''}</div>`;
    }
    out += `</div>`;
  }
  return out;
}

function subBudget(S) {
  const P = S.profile, c = activeCycle(S), cost = c ? cycleCost(S, c) : null;
  const homeDaysMonth = Math.round(P.homeDays.length * 30 / 7);
  const planMonth = cost ? cost.perDay * homeDaysMonth : 0, left = P.budget - planMonth - CREATINE_MONTH;
  let out = `<div class="block"><h3>Budget this month</h3>
  <label class="f" for="bud">Food budget (SAR / month)</label><input class="t" id="bud" inputmode="numeric" data-prof="budget" value="${P.budget}">
  <div style="margin-top:12px">${cost ? stat(`Home food (${homeDaysMonth} days × ${cost.perDay.toFixed(1)} SAR)`, Math.round(planMonth) + ' SAR') : stat('Home food', 'make a plan first')}${stat('Creatine', CREATINE_MONTH + ' SAR')}${stat('Left for eating out', `<span style="color:${left < 0 ? 'var(--red)' : 'var(--green)'}">${Math.round(left)} SAR</span>`)}</div>
  <p class="small muted" style="margin:8px 0 0">${left < 0 ? 'Over budget. Swap tuna meals for eggs or ful, or update prices from كيو.' : `About ${Math.max(0, Math.floor(left / 35))} cheap meals out a month.`} The first shop costs more: rice, oil and spices last 2–3 months.</p></div>
  <h2>Eating out: safe orders</h2><div class="block">${EAT_OUT.map(([n, k]) => stat(esc(n), `<span style="color:${k >= 1000 ? 'var(--red)' : 'inherit'}">~${k} kcal</span>`)).join('')}<p class="small muted" style="margin:8px 0 0">Rough numbers. Log it in Today so the check-in knows.</p></div>
  <details class="block"><summary>Prices and protein per riyal</summary><p class="small muted">Estimates. Update them from كيو and everything recalculates. Higher protein per riyal is better value.</p><div class="tablewrap"><table class="t"><tr><th>Item</th><th class="num">SAR</th><th class="num">g protein / SAR</th></tr>`;
  const ranked = foodsList(S).map(f => ({ f, ppr: f.m[1] * (f.pack / f.b) / (priceOf(S, f.id) || 1) })).sort((a, b) => b.ppr - a.ppr);
  for (const { f, ppr } of ranked) out += `<tr><td>${esc(f.n)}<br><span class="small muted">${esc(f.pl)}</span></td><td class="num"><input class="price" inputmode="decimal" data-price="${f.id}" value="${priceOf(S, f.id)}" aria-label="${esc(f.n)} price"></td><td class="num">${ppr.toFixed(1)}</td></tr>`;
  out += `</table></div></details>
  <h2>Supplements</h2><div class="block"><p><strong>Creatine monohydrate, 5 g a day,</strong> every day including weekends, any time. Plain monohydrate only.</p><p><strong>Whey:</strong> only if its protein per riyal beats your foods in the table above.</p><p style="margin:0"><strong>Skip:</strong> fat burners, BCAAs, test boosters, "shred" products. Coffee before the gym is fine.</p></div>`;
  return out;
}

export function vRecipe() {
  const S = app.S, r = recipe(S, ui.route.id);
  if (!r) return `<button class="btn sm ghost" data-act="back">← Back</button><p>Recipe not found.</p>`;
  const c = activeCycle(S), f = c ? flexFactor(S, c) : 1, n = ui.route.n || 1;
  const per = scaled(S, r, f), tt = recipeTotals(S, r, f);
  return `<button class="btn sm ghost" data-act="back">← Back</button><h1 class="day" style="font-size:40px;margin-top:10px">${esc(r.n)}</h1>
  <p class="muted">${KIND[r.kind]}${r.time ? ` · ${r.time} min` : ''}${r.tool ? ` · ${esc(r.tool)}` : ''}${r.keeps ? ` · keeps ${r.keeps} days` : ''}</p>
  <div class="targets"><div class="target"><b>${Math.round(tt.kcal)}</b><span>kcal / portion</span></div><div class="target"><b>${Math.round(tt.p)} g</b><span>protein</span></div><div class="target"><b>${tt.cost.toFixed(1)}</b><span>SAR</span></div></div>
  <div class="block"><div class="row between"><h3 style="margin:0">Ingredients</h3><div class="seg" style="width:160px">${[1, 2, 3].map(k => `<button data-act="portions" data-n="${k}" class="${k === n ? 'on' : ''}">×${k}</button>`).join('')}</div></div>
  <ul class="ing">${per.map(([id, q, flex]) => `<li>${esc(itemLabel(S, id, Math.round(q * n * 10) / 10))}${flex ? ' <span class="small muted">· scaled to your calories</span>' : ''}</li>`).join('')}</ul>
  <p class="small muted" style="margin:0">Plus spices: salt, pepper and what the steps mention. Medium spice at most.</p></div>
  <div class="block"><h3>Steps</h3><ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
  ${isHidden(S, r.id) ? `<button class="btn block-w" data-act="hiderecipe" data-id="${r.id}">Put it back in the rotation</button>` : `<button class="btn block-w ghost" data-act="hiderecipe" data-id="${r.id}">Don't plan this dish again</button><p class="small muted" style="text-align:center">It gets swapped out of your plan from today on. Undo any time in Food > Recipes.</p>`}`;
}
export { check };
