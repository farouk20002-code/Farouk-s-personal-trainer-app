import { app } from '../store.js';
import { ui, today, seg, stat, check } from '../ui.js';
import { esc, addDays, diffDays, dow, fmtDate, fmtShort, DOWL, num, r1 } from '../util.js';
import { SESSIONS, planWeek, calWeek, isPaused, phaseFor, weekInBlock, dayKind, doneInWeek, touched, DAYPLAN } from '../training.js';
import { cycleFor, dayPlan, flexFactor, MEAL_LABEL } from '../mealplan.js';
import { rings, ringsClosed, progress, goalProgress, cookToday, WEIGH_DAYS } from '../game.js';
import { weightAvg } from '../adapt.js';

export const EAT_OUT = [
  ['Grilled chicken (half, skin off) + salad + small rice', 650],
  ['Chicken shawarma sandwich + laban, no fries', 550],
  ['Mandi or kabsa: all the chicken, half the rice', 800],
  ['Burger: single patty, no fries, diet drink', 550],
  ['Family meal in Makkah (big plate)', 1000],
  ['Broasted 4-piece with fries and bun', 1200]
];
export const ACTS = [['football', 'Football'], ['swim', 'Swim'], ['run', 'Run'], ['walk', 'Walk'], ['other', 'Other']];
export const PREP = [['inbody', 'First InBody done'], ['creatine', 'Buy creatine monohydrate'], ['tape', 'Buy a tape measure'], ['plan', 'Make your 2-week meal plan'], ['boxes', 'Buy 10–12 meal-prep boxes'], ['photos', 'Take front, side, back and neck photos'], ['reminders', 'Add reminders to your calendar'], ['bag', 'Pack the gym bag Saturday night']];
export const dailyKey = () => ui.logDate || today();

/* ---------- Next up: the one thing to do now ---------- */
function nextUp(S, t, hr) {
  const w = planWeek(S, t), cw = calWeek(S, t), d = S.daily[t] || {}, kind = dayKind(t);
  const card = (kicker, title, sub, buttons, extra = '') => `<section class="next"><div class="kicker">${kicker}</div><h1 class="nexttitle ${title.length > 22 ? 'long' : ''}">${title}</h1>${sub ? `<p class="nextsub">${sub}</p>` : ''}${extra}<div class="nextbtns">${buttons}</div></section>`;
  const btn = (label, attrs, primary = true) => `<button class="btn ${primary ? 'primary' : ''} block-w" ${attrs}>${label}</button>`;
  if (w < 1) {
    const p = S.prep || {}, left = PREP.filter(([id]) => !(id === 'plan' ? (S.meal.cycles || []).length : p[id]));
    const n = diffDays(t, S.profile.startDate);
    if (!left.length) return card('Ready', `${n} day${n === 1 ? '' : 's'} to go`, `Week 1 starts ${fmtDate(S.profile.startDate)}, Lower A at 6am.`, btn('Preview Sunday\'s session', `data-act="opensession" data-sid="LA" data-date="${S.profile.startDate}"`, false));
    const [id, label] = left[0];
    return card(`Get set up · ${PREP.length - left.length}/${PREP.length} · ${n} day${n === 1 ? '' : 's'} to go`, esc(label), '', id === 'plan' ? btn('Make my meal plan', 'data-act="food" data-sub="plan"') : id === 'photos' ? btn('Take photos', 'data-act="go" data-tab="progress"') + btn('Done', `data-act="prep" data-id="${id}"`, false) : id === 'reminders' ? btn('Set reminders', 'data-act="go" data-tab="settings"') + btn('Done', `data-act="prep" data-id="${id}"`, false) : btn('Done ✓', `data-act="prep" data-id="${id}"`));
  }
  if (isPaused(S, cw)) return card('Paused week', 'Rest up', 'The plan waits for you. Protein, sleep, walk.', btn('I\'m back, unpause', `data-act="pause" data-cw="${cw}"`, false));
  if (WEIGH_DAYS.includes(dow(t)) && hr < 12 && num(d.weight) == null) return card('Weigh-in day', 'Step on the scale', 'After the toilet, before food or water.', `<div class="row"><input class="t big" id="nw" inputmode="decimal" placeholder="kg" aria-label="Weight in kg"><button class="btn primary" data-act="weighsave" data-src="nw">Save</button></div>`);
  if (SESSIONS[kind]) {
    const rec = S.logs[t]?.[kind];
    if (!rec?.done && hr < 20) {
      const ph = phaseFor(w);
      return card(`${hr >= 9 ? 'Evening slot' : '6am'} · Week ${weekInBlock(w)} · ${ph.n}`, SESSIONS[kind].n, SESSIONS[kind].focus, btn(touched(rec) ? 'Continue session' : 'Start session', `data-act="opensession" data-sid="${kind}" data-date="${t}"`));
    }
  }
  if (kind === 'THU' && hr < 12) {
    const dn = doneInWeek(S, cw), missed = ['UA', 'UB'].find(x => !dn.has(x));
    if (missed && !S.logs[t]?.[missed]?.done) return card('Make-up option', `Do ${SESSIONS[missed].n}`, 'You missed it this week. Do it this morning instead of the swim. Skip the cold jacuzzi after.', btn(`Start ${SESSIONS[missed].n}`, `data-act="opensession" data-sid="${missed}" data-date="${t}"`));
  }
  const c = cycleFor(S, t), soon = cycleFor(S, addDays(t, 3));
  if (!c || (dow(t) === S.profile.shopDay && !soon)) return card('Food', 'Plan the next 2 weeks', 'Then take the shopping list with you.', btn('Make my meal plan', 'data-act="food" data-sub="plan"'));
  if (c.start === t && hr < 21) return card('Shopping day', 'Shop for 2 weeks', 'Everything is on the list, with Arabic names.', btn('Open shopping list', 'data-act="food" data-sub="shop"'));
  const ck = cookToday(S, t);
  if (ck && !d.cooked && hr >= 13) return card(ck.big ? '🔥 Big cook night' : 'Cook tonight', esc(ck.dishes.map(x => x.r.n).join(' + ')), `About ${ck.minutes} min · ${ck.dishes.reduce((a, x) => a + x.portions, 0)} portions`, btn('Open cook plan', 'data-act="food" data-sub="cook"') + btn('Done cooking ✓', `data-act="cooked" data-big="${ck.big ? 1 : 0}"`, false));
  const lastCi = S.checkins[S.checkins.length - 1];
  if ([6, 0].includes(dow(t)) && diffDays(S.profile.startDate, t) >= 7 && (!lastCi || diffDays(lastCi.date, t) >= 6)) return card('Weekly', 'Check-in', 'Measure your waist, then let the app read your week. One minute.', btn('Start check-in', 'data-act="go" data-tab="progress"'));
  const r = rings(S, t).filter(x => !x.done);
  if (r.length) return card('Today', `${r.length} ring${r.length > 1 ? 's' : ''} left`, r.map(x => x.label).join(' · '), '');
  const tm = addDays(t, 1), tk = DAYPLAN[dow(tm)];
  return card('Day complete 🔥', 'All done', SESSIONS[tk] ? `Tomorrow: ${SESSIONS[tk].n} at 6am. Bed by 10:30.` : 'Enjoy the evening.', '');
}

/* ---------- Rings ---------- */
function ringsRow(S, k) {
  const list = rings(S, k), R = 26, C = 2 * Math.PI * R;
  const circle = x => `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" class="rbg"/><circle cx="32" cy="32" r="${R}" class="rfg" stroke-dasharray="${C}" stroke-dashoffset="${x.done ? 0 : x.half ? C / 2 : C}" transform="rotate(-90 32 32)"/></svg>`;
  let out = `<div class="rings">${list.map(x => `<button class="ring ${x.done ? 'done' : ''}" data-act="ring" data-id="${x.id}" aria-pressed="${x.done}" aria-label="${x.label}">${circle(x)}<span class="ricon">${x.done ? '✓' : x.icon}</span><span class="rlabel">${x.label}</span></button>`).join('')}</div>`;
  const d = S.daily[k] || {};
  if (ui.ringOpen === 'food') out += `<div class="ringpanel"><span class="small muted">Ate to plan today?</span>${seg('dailyseg', 'food', d.food, [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']])}</div>`;
  if (ui.ringOpen === 'weigh') out += `<div class="ringpanel"><div class="row"><input class="t" id="rw" inputmode="decimal" placeholder="Morning weight, kg" value="${esc(d.weight || '')}"><button class="btn primary" data-act="weighsave" data-src="rw">Save</button></div></div>`;
  if (ui.ringOpen === 'posture') out += `<div class="ringpanel small">${postureSteps()}<button class="btn primary block-w" style="margin-top:8px" data-act="dailytick" data-f="posture">${d.posture ? 'Undo' : 'Done ✓'}</button></div>`;
  return out;
}
const postureSteps = () => `<div class="stat"><span>Chin tucks, hold 2 s</span><b>2×10</b></div><div class="stat"><span>Doorway chest stretch</span><b>2×30 s</b></div><div class="stat"><span>Upper-back extension over a chair</span><b>10</b></div><div class="stat"><span>Wall angels</span><b>10</b></div>`;

/* ---------- Header: level, XP, streaks, goal ---------- */
function levelBar(p) {
  return `<button class="lvl" data-act="go" data-tab="progress" aria-label="Level and badges"><span class="lvnum">LV ${p.lv.level}</span><span class="lvname">${p.lv.name}</span><span class="xpbar"><i style="width:${Math.round(p.lv.into / p.lv.need * 100)}%"></i></span><span class="lvxp">${p.lv.into}/${p.lv.need} XP</span></button>`;
}
function streakStrip(st) {
  const tile = (v, l, icon) => `<div class="streak ${v ? 'on' : ''}"><b>${icon} ${v}</b><span>${l}</span></div>`;
  return `<div class="streaks">${tile(st.weeks, 'perfect weeks', '🔥')}${tile(st.food, 'on-plan days', '🍽️')}${tile(st.creatine, 'creatine days', '⚡')}${tile(st.weigh, 'weigh-ins', '⚖️')}</div>`;
}
function goalCard(S, t) {
  const g = goalProgress(S, t);
  return `<div class="goal"><div class="row between"><span class="small muted">Goal</span><span class="small"><b>${g.cur != null ? r1(g.cur) : g.start}</b> → ${g.goal} kg</span></div><div class="goalbar"><i style="width:${Math.round(g.pct * 100)}%"></i></div><div class="row between"><span class="tiny muted">${g.start} kg start</span><span class="tiny muted">${g.cur != null ? `${Math.max(0, g.left)} kg to go` : 'weigh in to start tracking'}</span></div></div>`;
}
function weekSummary(S, t) {
  if (![5, 6].includes(dow(t))) return '';
  const cw = calWeek(S, t); if (cw < 1) return '';
  const n = doneInWeek(S, cw).size, a = weightAvg(S, t, 0), b = weightAvg(S, t, 1);
  let food = 0, days = 0; for (let i = 0; i < 7; i++) { const v = S.daily[addDays(t, -i)]?.food; if (v) { days++; if (v === 'yes') food++; } }
  return `<div class="block summary"><div class="kicker">This week</div><div class="sumgrid"><div><b>${n}/4</b><span>sessions</span></div><div><b>${a != null && b != null ? (a - b > 0 ? '+' : '') + r1(a - b) : '–'}</b><span>kg vs last week</span></div><div><b>${days ? food + '/' + days : '–'}</b><span>days on plan</span></div></div></div>`;
}

/* ---------- Secondary: food today and extra logging ---------- */
function foodToday(S, t) {
  const c = cycleFor(S, t); if (!c) return '';
  const dp = dayPlan(S, c, t, flexFactor(S, c)); if (!dp) return '';
  return `<details class="block"><summary>🍽️ Today's food <span class="small muted">· ${Math.round(dp.t.kcal)} kcal · ${Math.round(dp.t.p)} g protein</span></summary>
  ${dp.meals.map(m => `<button class="mealrow" data-act="recipe" data-id="${m.r.id}"><span class="small muted">${MEAL_LABEL[m.meal]}</span><span><strong>${esc(m.r.n)}</strong></span><span class="small muted">${Math.round(m.tot.kcal)}</span></button>`).join('')}</details>`;
}
function moreLog(S) {
  const t = today(), k = ui.logDate || t, d = S.daily[k] || {}, isToday = k === t;
  const acts = d.acts || [], off = d.offplan || [];
  return `<details class="block" id="dailylog" ${ui.logDate ? 'open' : ''}><summary>＋ More logging <span class="small muted">· steps, sleep, football, meals out, past days</span></summary>
  <div class="row between" style="margin-top:8px"><button class="btn sm ghost" data-act="logday" data-d="-1" aria-label="Previous day">‹</button><strong>${isToday ? 'Today' : `${fmtDate(k)} <button class="linkbtn" data-act="logday" data-d="0">back to today</button>`}</strong><button class="btn sm ghost" data-act="logday" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Next day">›</button></div>
  ${isToday ? '' : `<div class="ringpanel" style="margin-top:8px">${seg('dailyseg', 'food', d.food, [['yes', 'Ate to plan'], ['partly', 'Partly'], ['no', 'No']])}<div class="row wrapflex" style="margin-top:8px"><button class="chip ${d.creatine ? 'on' : ''}" data-act="dailytick" data-f="creatine">⚡ Creatine</button><button class="chip ${d.posture ? 'on' : ''}" data-act="dailytick" data-f="posture">🧍 Posture</button></div></div>`}
  <div class="grid3" style="margin-top:6px"><div><label class="f" for="dw">Weight</label><input class="t" id="dw" inputmode="decimal" data-daily="weight" value="${esc(d.weight || '')}" placeholder="kg"></div>
  <div><label class="f" for="ds">Steps</label><input class="t" id="ds" inputmode="numeric" data-daily="steps" value="${esc(d.steps || '')}" placeholder="8000"></div>
  <div><label class="f" for="dsl">Sleep</label><input class="t" id="dsl" inputmode="decimal" data-daily="sleep" value="${esc(d.sleep || '')}" placeholder="h"></div></div>
  <label class="f">Football, swim, run</label>
  ${acts.map((a, i) => `<div class="stat"><span>${esc((ACTS.find(x => x[0] === a.t) || ['', a.t])[1])}</span><b>${a.min} min <button class="linkbtn" data-act="delact" data-i="${i}">remove</button></b></div>`).join('')}
  <div class="row"><select class="t" id="actT" style="flex:1">${ACTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><input class="t" id="actM" inputmode="numeric" placeholder="min" style="width:80px"><button class="btn" data-act="addact">Add</button></div>
  <label class="f">Ate out</label>
  ${off.map((o, i) => `<div class="stat"><span>${esc(o.n)}</span><b>~${o.kcal} <button class="linkbtn" data-act="deloff" data-i="${i}">remove</button></b></div>`).join('')}
  <div class="row wrapflex">${EAT_OUT.map(([n, kc], i) => `<button class="chip" data-act="addoff" data-i="${i}">${esc(n.split(':')[0].split('(')[0].split('+')[0].trim())} · ${kc}</button>`).join('')}</div>
  </details>`;
}

/* ---------- Everything coming up: setup checklist + next 7 days ---------- */
function agenda(S, t) {
  const tick = ok => `<span class="agtick ${ok ? 'ok' : ''}">${ok ? '✓' : ''}</span>`;
  const row = (ok, label, attrs = '') => `<button class="agrow ${ok ? 'done' : ''}" ${attrs || 'disabled'}>${tick(ok)}<span>${label}</span></button>`;
  let out = `<div class="block agenda">`;
  if (t < S.profile.startDate) {
    const p = S.prep || {};
    const done = PREP.filter(([id]) => id === 'plan' ? (S.meal.cycles || []).length : p[id]).length;
    out += `<div class="row between"><h3 style="margin:0">Setup checklist</h3><span class="small muted">${done}/${PREP.length} done</span></div><p class="small muted" style="margin:4px 0 6px">Tick them in any order.</p>`;
    out += PREP.map(([id, l]) => id === 'plan' ? check('food', (S.meal.cycles || []).length, esc(l) + ' <span class="small muted">› Food</span>', 'data-sub="plan"') : check('prep', p[id], esc(l), `data-id="${id}"`)).join('');
  }
  out += `<h3 style="margin:${t < S.profile.startDate ? '16px' : '0'} 0 4px">Next 7 days</h3>`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, i), wd = dow(d), dd = S.daily[d] || {}, items = [];
    const started = d >= S.profile.startDate, paused = started && isPaused(S, calWeek(S, d));
    const c = cycleFor(S, d);
    if ((c && c.start === d) || (wd === S.profile.shopDay && !cycleFor(S, addDays(d, 2)))) items.push(c && c.start === d ? row(i === 0 && (c.got && Object.keys(c.got).length > 0), 'Shopping for 2 weeks', 'data-act="food" data-sub="shop"') : row(false, 'Shopping day: make the 2-week plan first', 'data-act="food" data-sub="plan"'));
    if (started && WEIGH_DAYS.includes(wd)) items.push(row(num(dd.weight) != null, 'Weigh-in, morning'));
    const kind = DAYPLAN[wd];
    if (started && !paused && SESSIONS[kind]) items.push(row(!!S.logs[d]?.[kind]?.done, `${SESSIONS[kind].n}, 6am`, `data-act="opensession" data-sid="${kind}" data-date="${d}"`));
    if (started && kind === 'THU') items.push(row(false, 'Football in Makkah tonight'));
    const ck = cookToday(S, d);
    if (ck) items.push(row(!!dd.cooked, `${ck.big ? 'Big cook night' : 'Cook'}: ${esc(ck.dishes.map(x => x.r.n).join(' + '))}`, 'data-act="food" data-sub="cook"'));
    if (d === S.profile.startDate) items.push(row(false, 'Plan starts: week 1, intro week'));
    if (started && wd === 6 && diffDays(S.profile.startDate, d) >= 6) items.push(row(S.checkins.some(x => x.date === d), 'Weekly check-in + waist', 'data-act="go" data-tab="progress"'));
    if (!items.length) items.push(`<p class="small muted" style="margin:2px 0 0">${wd === 5 || wd === 6 ? 'Rest day, Makkah' : 'Nothing planned'}</p>`);
    out += `<div class="agday"><div class="aghead">${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DOWL[wd]} <span class="muted">${fmtShort(d)}</span></div>${items.join('')}</div>`;
  }
  return out + `</div>`;
}

export function vToday() {
  const S = app.S, t = today(), hr = new Date().getHours(), p = progress(S, t);
  const rc = ringsClosed(S, t);
  let out = levelBar(p) + nextUp(S, t, hr);
  out += `<button class="seeall" data-act="agenda" aria-expanded="${!!ui.agendaOpen}">${ui.agendaOpen ? 'Hide the list' : t < S.profile.startDate ? 'See the full setup checklist and next 7 days' : 'See everything coming up this week'} ${ui.agendaOpen ? '▴' : '▾'}</button>`;
  if (ui.agendaOpen) out += agenda(S, t);
  if (rc.total) out += `<div class="sectionhead"><span>Today's rings</span><span class="muted">${rc.done}/${rc.total}</span></div>` + ringsRow(S, t);
  out += streakStrip(p.st) + goalCard(S, t) + weekSummary(S, t);
  const lastBackup = S.lastBackup, hasData = Object.keys(S.daily).length + Object.keys(S.logs).length > 3;
  if (hasData && (!lastBackup || diffDays(lastBackup, t) >= 14)) out += `<button class="banner" data-act="backup"><strong>Back up your data</strong> · it only lives on this phone</button>`;
  out += foodToday(S, t) + moreLog(S);
  out += `<details class="block"><summary>🧍 Posture routine <span class="small muted">· 3 min</span></summary>${postureSteps()}<p class="small muted" style="margin:8px 0 0">Screen at eye level, phone up. See a doctor if the neck bump grows, hurts, or you get tingling or headaches.</p></details>`;
  return out;
}
export { stat, fmtShort, weekInBlock };
