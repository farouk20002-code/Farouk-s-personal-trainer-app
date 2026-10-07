import { app } from '../store.js';
import { ui, today, seg, stat } from '../ui.js';
import { esc, addDays, diffDays, dow, fmtDate, fmtShort, DOWL, num, r1 } from '../util.js';
import { SESSIONS, planWeek, calWeek, isPaused, phaseFor, weekInBlock, dayKind, doneInWeek, touched, DAYPLAN } from '../training.js';
import { cycleFor, dayPlan, flexFactor, MEAL_LABEL } from '../mealplan.js';
import { rings, ringsClosed, progress, goalProgress, cookToday, streaks, WEIGH_DAYS } from '../game.js';
import { sec, cell, ICON, chev } from './ios.js';
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
  const card = (kicker, title, sub, buttons, extra = '') => `<section class="upnext"><div class="eyebrow">${kicker}</div><h2 class="uptitle">${title}</h2>${sub ? `<p class="upsub">${sub}</p>` : ''}${extra}${buttons ? `<div class="stack">${buttons}</div>` : ''}</section>`;
  const btn = (label, attrs, primary = true) => `<button class="btn ${primary ? 'fill' : 'tinted'}" ${attrs}>${label}</button>`;
  if (w < 1) {
    const p = S.prep || {}, left = PREP.filter(([id]) => !(id === 'plan' ? (S.meal.cycles || []).length : p[id]));
    const n = diffDays(t, S.profile.startDate);
    if (!left.length) return card('Ready', `${n} day${n === 1 ? '' : 's'} to go`, `Week 1 starts ${fmtDate(S.profile.startDate)}, Lower A at 6am.`, btn('Preview Sunday\'s Session', `data-act="opensession" data-sid="LA" data-date="${S.profile.startDate}"`, false));
    const [id, label] = left[0];
    return card(`Get set up · ${PREP.length - left.length}/${PREP.length} · ${n} day${n === 1 ? '' : 's'} to go`, esc(label), '', id === 'plan' ? btn('Make My Meal Plan', 'data-act="food" data-sub="plan"') : id === 'photos' ? btn('Take Photos', 'data-act="go" data-tab="progress"') + btn('Done', `data-act="prep" data-id="${id}"`, false) : id === 'reminders' ? btn('Set Reminders', 'data-act="go" data-tab="settings"') + btn('Done', `data-act="prep" data-id="${id}"`, false) : btn('Done', `data-act="prep" data-id="${id}"`));
  }
  if (isPaused(S, cw)) return card('Paused week', 'Rest up', 'The plan waits for you. Protein, sleep, walk.', btn('Unpause This Week', `data-act="pause" data-cw="${cw}"`, false));
  if (WEIGH_DAYS.includes(dow(t)) && hr < 12 && num(d.weight) == null) return card('Weigh-in day', 'Step on the scale', 'After the toilet, before food or water.', `<div class="weighrow"><input class="bigfield" id="nw" inputmode="decimal" placeholder="0.0" aria-label="Weight in kg"><span class="unit">kg</span><button class="btn fill" data-act="weighsave" data-src="nw">Save</button></div>`);
  if (SESSIONS[kind]) {
    const rec = S.logs[t]?.[kind];
    if (!rec?.done && hr < 20) {
      const ph = phaseFor(w);
      return card(`${hr >= 9 ? 'Evening slot' : '6am'} · Week ${weekInBlock(w)} · ${ph.n}`, SESSIONS[kind].n, SESSIONS[kind].focus, btn(touched(rec) ? 'Continue Session' : 'Start Session', `data-act="opensession" data-sid="${kind}" data-date="${t}"`));
    }
  }
  if (kind === 'THU' && hr < 12) {
    const dn = doneInWeek(S, cw), missed = ['UA', 'UB'].find(x => !dn.has(x));
    if (missed && !S.logs[t]?.[missed]?.done) return card('Make-up option', `Do ${SESSIONS[missed].n}`, 'You missed it this week. Do it this morning instead of the swim. Skip the cold jacuzzi after.', btn(`Start ${SESSIONS[missed].n}`, `data-act="opensession" data-sid="${missed}" data-date="${t}"`));
  }
  const c = cycleFor(S, t), soon = cycleFor(S, addDays(t, 3));
  if (!c || (dow(t) === S.profile.shopDay && !soon)) return card('Food', 'Plan the next 2 weeks', 'Then take the shopping list with you.', btn('Make My Meal Plan', 'data-act="food" data-sub="plan"'));
  if (c.start === t && hr < 21) return card('Shopping day', 'Shop for 2 weeks', 'Everything is on the list, with Arabic names.', btn('Open Shopping List', 'data-act="food" data-sub="shop"'));
  const ck = cookToday(S, t);
  if (ck && !d.cooked && hr >= 13) return card(ck.big ? 'Big cook night' : 'Cook tonight', esc(ck.dishes.map(x => x.r.n).join(' + ')), `About ${ck.minutes} min · ${ck.dishes.reduce((a, x) => a + x.portions, 0)} portions`, btn('Open Cook Plan', 'data-act="food" data-sub="cook"') + btn('Done Cooking', `data-act="cooked" data-big="${ck.big ? 1 : 0}"`, false));
  const lastCi = S.checkins[S.checkins.length - 1];
  if ([6, 0].includes(dow(t)) && diffDays(S.profile.startDate, t) >= 7 && (!lastCi || diffDays(lastCi.date, t) >= 6)) return card('Weekly', 'Check-in', 'Measure your waist, then let the app read your week. One minute.', btn('Start Check-in', 'data-act="go" data-tab="progress"'));
  const r = rings(S, t).filter(x => !x.done);
  if (r.length) return card('Today', `${r.length} habit${r.length > 1 ? 's' : ''} left`, r.map(x => x.label).join(', '), '');
  const tm = addDays(t, 1), tk = DAYPLAN[dow(tm)];
  return card('Day complete', 'All rings closed', SESSIONS[tk] ? `Tomorrow: ${SESSIONS[tk].n} at 6am. Bed by 10:30.` : 'Enjoy the evening.', '');
}

/* ---------- Activity rings (signature): week's training, today's food, today's habits ---------- */
function activity(S, t) {
  const cw = calWeek(S, t), started = t >= S.profile.startDate;
  const trainN = started ? doneInWeek(S, cw).size : 0;
  const d = S.daily[t] || {}, hab = rings(S, t).filter(x => ['creatine', 'posture', 'weigh'].includes(x.id));
  const food = d.food === 'yes' ? 1 : d.food === 'partly' ? 0.5 : 0;
  const habN = hab.filter(x => x.done).length;
  const R = [{ r: 52, p: trainN / 4, c: 'var(--ring-red)', bg: 'var(--ring-red-bg)' }, { r: 38, p: food, c: 'var(--ring-green)', bg: 'var(--ring-green-bg)' }, { r: 24, p: hab.length ? habN / hab.length : 0, c: 'var(--ring-cyan)', bg: 'var(--ring-cyan-bg)' }];
  const svg = `<svg class="act" viewBox="0 0 120 120" role="img" aria-label="Training ${trainN} of 4 this week, food ${food === 1 ? 'on plan' : food ? 'partly on plan' : 'not logged'}, habits ${habN} of ${hab.length}">${R.map(x => { const C = 2 * Math.PI * x.r; return `<circle cx="60" cy="60" r="${x.r}" stroke="${x.bg}" class="trk"/><circle cx="60" cy="60" r="${x.r}" stroke="${x.c}" class="prog" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(1, x.p))}" transform="rotate(-90 60 60)"/>`; }).join('')}</svg>`;
  const leg = (cls, label, val, unit) => `<div class="leg ${cls}"><span>${label}</span><b>${val}<small>${unit}</small></b></div>`;
  return `<section class="actcard">${svg}<div class="legend">${leg('red', 'Training', trainN, '/4 this week')}${leg('green', 'Food', food === 1 ? 'On plan' : food ? 'Partly' : '–', '')}${leg('cyan', 'Habits', habN, `/${hab.length} today`)}</div></section>`;
}

/* ---------- Habits as Reminders-style rows ---------- */
function habits(S, k) {
  const list = rings(S, k), d = S.daily[k] || {};
  if (!list.length) return '';
  const icons = { train: ['dumbbell', 'red'], food: ['plate', 'green'], creatine: ['bolt', 'yellow'], posture: ['figure', 'cyan'], weigh: ['scale', 'blue'] };
  const sub = { train: SESSIONS[dayKind(k)]?.n || '', food: d.food === 'partly' ? 'Partly' : d.food === 'no' ? 'Not today' : 'Tap to log', creatine: '5 g', posture: 'Chin tucks, stretch, wall angels · 3 min', weigh: num(d.weight) != null ? `${d.weight} kg` : 'Morning, before food' };
  let rows = list.map(x => { const [ic, col] = icons[x.id];
    return `<div class="cell habit ${x.done ? 'done' : ''}"><button class="rcheck ${x.done ? 'on' : ''} ${col}" data-act="ring" data-id="${x.id}" aria-pressed="${x.done}" aria-label="${x.label}">${x.done ? ICON.checkSm : ''}</button><button class="cbody" data-act="ring" data-id="${x.id}"><span class="ct">${x.label}</span><span class="cs">${esc(sub[x.id])}</span></button><span class="ic sm ${col}">${ICON[ic]}</span></div>`;
  }).join('');
  if (ui.ringOpen === 'food') rows += `<div class="cell"><div class="cbody static">${seg('dailyseg', 'food', d.food, [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']])}</div></div>`;
  if (ui.ringOpen === 'weigh') rows += `<div class="cell"><div class="weighrow"><input class="bigfield" id="rw" inputmode="decimal" placeholder="0.0" value="${esc(d.weight || '')}" aria-label="Morning weight in kg"><span class="unit">kg</span><button class="btn fill" data-act="weighsave" data-src="rw">Save</button></div></div>`;
  if (ui.ringOpen === 'posture') rows += `<div class="cell"><div class="cbody static">${postureSteps()}<button class="btn fill" style="margin-top:10px" data-act="dailytick" data-f="posture">${d.posture ? 'Undo' : 'Mark Done'}</button></div></div>`;
  const rc = ringsClosed(S, k);
  return sec('Habits', rows, null, `${rc.done} of ${rc.total}`);
}
const postureSteps = () => `<div class="kv"><span>Chin tucks, hold 2 s</span><b>2 × 10</b></div><div class="kv"><span>Doorway chest stretch</span><b>2 × 30 s</b></div><div class="kv"><span>Upper-back extension over a chair</span><b>10</b></div><div class="kv"><span>Wall angels</span><b>10</b></div>`;

/* ---------- Streaks, level, goal ---------- */
function awards(S, p) {
  const tile = (v, label, col, ic) => `<div class="award ${v ? 'on' : ''}"><span class="ic sm ${v ? col : 'gray'}">${ICON[ic]}</span><b>${v}</b><span>${label}</span></div>`;
  return `<section class="sec"><div class="sechead"><span>Streaks</span><button class="trail link" data-act="go" data-tab="progress">Level ${p.lv.level} · ${p.lv.name}</button></div><div class="awards">${tile(p.st.weeks, 'Perfect weeks', 'red', 'flame')}${tile(p.st.food, 'On-plan days', 'green', 'plate')}${tile(p.st.creatine, 'Creatine days', 'yellow', 'bolt')}${tile(p.st.weigh, 'Weigh-ins', 'blue', 'scale')}</div></section>`;
}
function goalCard(S, t) {
  const g = goalProgress(S, t);
  return sec('Goal', `<div class="cell"><div class="cbody static"><div class="goalline"><span class="ct">${g.cur != null ? r1(g.cur) : g.start} kg</span><span class="cs">${g.cur != null ? `${Math.max(0, g.left)} kg to ${g.goal}` : `Target ${g.goal} kg`}</span></div><div class="pbar"><i style="width:${Math.round(g.pct * 100)}%"></i></div><span class="cs">Weekly average, from ${g.start} kg at the start</span></div></div>`);
}
function weekSummary(S, t) {
  if (![5, 6].includes(dow(t))) return '';
  const cw = calWeek(S, t); if (cw < 1) return '';
  const n = doneInWeek(S, cw).size, a = weightAvg(S, t, 0), b = weightAvg(S, t, 1);
  let food = 0, days = 0; for (let i = 0; i < 7; i++) { const v = S.daily[addDays(t, -i)]?.food; if (v) { days++; if (v === 'yes') food++; } }
  return `<section class="sec"><div class="sechead"><span>This week</span></div><div class="summary3 card"><div><b>${n}/4</b><span>Sessions</span></div><div><b>${a != null && b != null ? (a - b > 0 ? '+' : '') + r1(a - b) : '–'}</b><span>kg vs last week</span></div><div><b>${days ? food + '/' + days : '–'}</b><span>Days on plan</span></div></div></section>`;
}

/* ---------- Food today and extra logging ---------- */
const MEAL_ICON = { breakfast: ['sunrise', 'orange'], lunch: ['box', 'blue'], snack: ['leaf', 'green'], dinner: ['moon', 'indigo'] };
function foodToday(S, t) {
  const c = cycleFor(S, t); if (!c) return '';
  const dp = dayPlan(S, c, t, flexFactor(S, c)); if (!dp) return '';
  return sec('Food today', dp.meals.map(m => cell({ icon: ICON[MEAL_ICON[m.meal][0]], color: MEAL_ICON[m.meal][1], title: m.r.n, sub: `${MEAL_LABEL[m.meal]} · ${Math.round(m.tot.kcal)} kcal`, act: `data-act="recipe" data-id="${m.r.id}"`, chevron: true })).join(''), null, `${Math.round(dp.t.kcal)} kcal · ${Math.round(dp.t.p)} g protein`);
}
function moreLog(S) {
  const t = today(), k = ui.logDate || t, d = S.daily[k] || {}, isToday = k === t;
  const acts = d.acts || [], off = d.offplan || [];
  return `<details class="sec disclose" id="dailylog" ${ui.logDate ? 'open' : ''}><summary class="sechead"><span>More logging</span><span class="trail">Steps, sleep, sport, meals out</span></summary><div class="list">
  <div class="cell"><div class="daynav"><button class="iconbtn2" data-act="logday" data-d="-1" aria-label="Previous day">${chev('left')}</button><span class="ct">${isToday ? 'Today' : fmtDate(k)}</span><button class="iconbtn2" data-act="logday" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Next day">${chev()}</button></div></div>
  ${isToday ? '' : `<div class="cell"><div class="cbody static">${seg('dailyseg', 'food', d.food, [['yes', 'Ate to plan'], ['partly', 'Partly'], ['no', 'No']])}<div class="chiprow"><button class="pill ${d.creatine ? 'on' : ''}" data-act="dailytick" data-f="creatine">Creatine</button><button class="pill ${d.posture ? 'on' : ''}" data-act="dailytick" data-f="posture">Posture</button><button class="pill" data-act="logday" data-d="0">Back to Today</button></div></div></div>`}
  <div class="cell"><label class="cbody static" for="dw"><span class="ct">Weight</span></label><div class="ctrail"><input class="inline" id="dw" inputmode="decimal" data-daily="weight" value="${esc(d.weight || '')}" placeholder="kg"></div></div>
  <div class="cell"><label class="cbody static" for="ds"><span class="ct">Steps</span></label><div class="ctrail"><input class="inline" id="ds" inputmode="numeric" data-daily="steps" value="${esc(d.steps || '')}" placeholder="8000"></div></div>
  <div class="cell"><label class="cbody static" for="dsl"><span class="ct">Sleep</span></label><div class="ctrail"><input class="inline" id="dsl" inputmode="decimal" data-daily="sleep" value="${esc(d.sleep || '')}" placeholder="hours"></div></div>
  ${acts.map((a, i) => `<div class="cell"><div class="cbody static"><span class="ct">${esc((ACTS.find(x => x[0] === a.t) || ['', a.t])[1])}</span><span class="cs">${a.min} min</span></div><button class="linkbtn2" data-act="delact" data-i="${i}">Remove</button></div>`).join('')}
  <div class="cell"><div class="addrow"><select id="actT" aria-label="Activity">${ACTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><input class="inline" id="actM" inputmode="numeric" placeholder="min" aria-label="Minutes"><button class="btn tinted small" data-act="addact">Add</button></div></div>
  ${off.map((o, i) => `<div class="cell"><div class="cbody static"><span class="ct">${esc(o.n)}</span><span class="cs">~${o.kcal} kcal</span></div><button class="linkbtn2" data-act="deloff" data-i="${i}">Remove</button></div>`).join('')}
  <div class="cell"><div class="cbody static"><span class="cs">Ate out? Tap what you had</span><div class="chiprow">${EAT_OUT.map(([n, kc], i) => `<button class="pill" data-act="addoff" data-i="${i}">${esc(n.split(':')[0].split('(')[0].split('+')[0].trim())} · ${kc}</button>`).join('')}</div></div></div>
  </div></details>`;
}

export function vToday() {
  const S = app.S, t = today(), hr = new Date().getHours(), p = progress(S, t), w = planWeek(S, t);
  const dateline = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  let out = `<header class="largehead"><div><div class="eyebrow plain">${dateline}</div><h1 class="lt">Today</h1></div><button class="avatar" data-act="go" data-tab="progress" aria-label="Level ${p.lv.level}, ${p.lv.into} of ${p.lv.need} XP"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="trk"/><circle cx="20" cy="20" r="17" class="prog" stroke-dasharray="${2 * Math.PI * 17}" stroke-dashoffset="${2 * Math.PI * 17 * (1 - p.lv.into / p.lv.need)}" transform="rotate(-90 20 20)"/></svg><span>${p.lv.level}</span></button></header>`;
  out += activity(S, t) + nextUp(S, t, hr) + habits(S, t) + awards(S, p) + goalCard(S, t) + weekSummary(S, t);
  const lastBackup = S.lastBackup, hasData = Object.keys(S.daily).length + Object.keys(S.logs).length > 3;
  if (hasData && (!lastBackup || diffDays(lastBackup, t) >= 14)) out += sec('', cell({ icon: ICON.box, color: 'gray', title: 'Back Up Your Data', sub: 'It only lives on this phone', act: 'data-act="backup"', chevron: true }));
  out += foodToday(S, t) + moreLog(S);
  return out;
}
export { stat, fmtShort, weekInBlock };
