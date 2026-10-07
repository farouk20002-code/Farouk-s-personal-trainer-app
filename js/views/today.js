import { app } from '../store.js';
import { ui, today, seg, check, stat } from '../ui.js';
import { esc, addDays, diffDays, dow, fmtDate, fmtShort, DOWL, num } from '../util.js';
import { SESSIONS, SESSION_IDS, planWeek, calWeek, isPaused, phaseFor, blockOf, weekInBlock, dayKind, doneInWeek, touched, sessionSummary, finisher } from '../training.js';
import { cycleFor, dayPlan, flexFactor, isCookDay, MEAL_LABEL, shopDayOnOrAfter, cookSessions } from '../mealplan.js';

export const EAT_OUT = [
  ['Grilled chicken (half, skin off) + salad + small rice', 650],
  ['Chicken shawarma sandwich + laban, no fries', 550],
  ['Mandi or kabsa: all the chicken, half the rice', 800],
  ['Burger: single patty, no fries, diet drink', 550],
  ['Family meal in Makkah (big plate)', 1000],
  ['Broasted 4-piece with fries and bun', 1200]
];
export const ACTS = [['football', 'Football'], ['swim', 'Swim'], ['run', 'Run'], ['walk', 'Walk'], ['other', 'Other']];

export function postureCard(S, k) {
  const d = S.daily[k] || {};
  return `<details class="block"><summary>Posture, 3 minutes a day ${d.posture ? '<span class="status ok">done</span>' : ''}</summary><p class="small muted">For the rounded shoulders, forward head and the bump at the base of your neck. After the gym, or at your desk mid-afternoon.</p>
  ${stat('Chin tucks: pull your head straight back (double chin), hold 2 s', '2×10')}
  ${stat('Doorway chest stretch, forearms on the frame, lean through', '2×30 s')}
  ${stat('Upper-back extension over a chair back or bench edge', '10 reps')}
  ${stat('Wall angels: back, head and arms against the wall, slide arms up', '10 reps')}
  <p class="small" style="margin:8px 0 0">Raise your laptop screen to eye level and hold your phone up instead of looking down. That matters as much as the exercises.</p>
  <p class="small muted" style="margin:8px 0 0">See a doctor if the bump grows, hurts, or you get numbness, tingling into the arms, or headaches.</p></details>`;
}

function dailyLog(S) {
  const t = today(), k = ui.logDate || t, d = S.daily[k] || {};
  const isToday = k === t;
  const acts = d.acts || [], off = d.offplan || [];
  return `<div class="block" id="dailylog"><div class="row between"><button class="btn sm ghost" data-act="logday" data-d="-1" aria-label="Previous day">‹</button><h3 style="margin:0;text-align:center">${isToday ? 'Today\'s log' : fmtDate(k)}</h3><button class="btn sm ghost" data-act="logday" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Next day">›</button></div>
  ${isToday ? '' : '<p class="small muted" style="text-align:center;margin:4px 0 0">Filling in a past day. <button class="linkbtn" data-act="logday" data-d="0">Back to today</button></p>'}
  <div class="grid3" style="margin-top:6px"><div><label class="f" for="dw">Weight (kg)</label><input class="t" id="dw" inputmode="decimal" data-daily="weight" value="${esc(d.weight || '')}" placeholder="86.6"></div>
  <div><label class="f" for="ds">Steps</label><input class="t" id="ds" inputmode="numeric" data-daily="steps" value="${esc(d.steps || '')}" placeholder="8000"></div>
  <div><label class="f" for="dsl">Sleep (h)</label><input class="t" id="dsl" inputmode="decimal" data-daily="sleep" value="${esc(d.sleep || '')}" placeholder="7"></div></div>
  <p class="small muted" style="margin:6px 0 0">Weigh in the morning after the toilet, before food. Steps and sleep from the Health app.</p>
  <label class="f">Ate to plan?</label>${seg('dailyseg', 'food', d.food, [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']])}
  <div style="margin-top:8px">${check('dailytick', d.creatine, 'Creatine 5 g', 'data-f="creatine"')}${check('dailytick', d.posture, 'Posture routine (3 min)', 'data-f="posture"')}</div>
  <details${acts.length ? ' open' : ''}><summary>Football, swim, run ${acts.length ? `<span class="status ok">${acts.map(a => a.min + ' min').join(', ')}</span>` : ''}</summary>
    ${acts.map((a, i) => `<div class="stat"><span>${esc((ACTS.find(x => x[0] === a.t) || ['', a.t])[1])}</span><b>${a.min} min <button class="linkbtn" data-act="delact" data-i="${i}">remove</button></b></div>`).join('')}
    <div class="row" style="margin-top:6px"><select class="t" id="actT" style="flex:1">${ACTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><input class="t" id="actM" inputmode="numeric" placeholder="min" style="width:80px"><button class="btn" data-act="addact">Add</button></div></details>
  <details${off.length ? ' open' : ''}><summary>Ate out or off plan ${off.length ? `<span class="status miss">~${off.reduce((a, o) => a + o.kcal, 0)} kcal</span>` : ''}</summary>
    ${off.map((o, i) => `<div class="stat"><span>${esc(o.n)}</span><b>~${o.kcal} <button class="linkbtn" data-act="deloff" data-i="${i}">remove</button></b></div>`).join('')}
    <p class="small muted">Tap what you had. It replaces one planned meal, it isn't a disaster.</p>
    <div class="row wrapflex">${EAT_OUT.map(([n, kc], i) => `<button class="chip" data-act="addoff" data-i="${i}">${esc(n.split(':')[0].split('(')[0].split('+')[0].trim())} · ${kc}</button>`).join('')}</div></details>
  </div>`;
}

function foodToday(S, t) {
  const c = cycleFor(S, t);
  const nextShop = shopDayOnOrAfter(S, t);
  if (!c) return `<div class="block alert"><h3>No meal plan for this week yet</h3><p class="small">Make your 2-week plan and shopping list. Shop ${nextShop === t ? 'today' : fmtDate(nextShop)}.</p><button class="btn primary block-w" data-act="food" data-sub="plan">Make my 2-week plan</button></div>`;
  const f = flexFactor(S, c), dp = dayPlan(S, c, t, f);
  let out = '';
  if (dow(t) === S.profile.shopDay && !cycleFor(S, addDays(t, 2))) out += `<div class="block alert"><h3>Shopping day</h3><p class="small">Your current plan ends soon. Make the next 2 weeks and take the list with you.</p><button class="btn primary block-w" data-act="food" data-sub="plan">Plan the next 2 weeks</button></div>`;
  else if (c.start === t) out += `<div class="block alert"><h3>Shopping day</h3><p class="small">Everything for the next 2 weeks is on the list.</p><button class="btn primary block-w" data-act="food" data-sub="shop">Open the shopping list</button></div>`;
  if (isCookDay(S, t)) { const s = cookSessions(S, c, f).find(x => x.date === t); if (s && s.dishes.length) out += `<div class="block alert"><h3>${s.big ? 'Big cook night tonight' : 'Cook tonight'}</h3><p class="small">${s.dishes.map(x => `${esc(x.r.n)} × ${x.portions}`).join(', ')}${s.boil ? `, and boil ${s.boil} eggs` : ''}. About ${s.minutes} min.</p><button class="btn primary block-w" data-act="food" data-sub="cook">Open tonight's cook plan</button></div>`; }
  if (!dp) return out + `<div class="block flat"><p class="small" style="margin:0"><strong>Away day.</strong> Eat the protein first, go easy on rice and sweets. One weekend can't ruin a week.</p></div>`;
  out += `<div class="block"><div class="row between"><h3>Today's food</h3><span class="small muted">${Math.round(dp.t.kcal)} kcal · ${Math.round(dp.t.p)} g protein</span></div>
  ${dp.meals.map(m => `<button class="mealrow" data-act="recipe" data-id="${m.r.id}"><span class="small muted">${MEAL_LABEL[m.meal]}</span><span><strong>${esc(m.r.n)}</strong>${m.cookDate ? ` <span class="small muted">· box from ${DOWL[dow(m.cookDate)]}</span>` : ''}</span><span class="small muted">${Math.round(m.tot.kcal)} kcal</span></button>`).join('')}
  </div>`;
  return out;
}

export function vToday() {
  const S = app.S, t = today(), w = planWeek(S, t), cw = calWeek(S, t), hr = new Date().getHours();
  let out = '';
  // Banners
  const lastCi = S.checkins[S.checkins.length - 1];
  if (w >= 1 && diffDays(S.profile.startDate, t) >= 7 && (!lastCi || diffDays(lastCi.date, t) >= 7)) out += `<button class="banner" data-act="go" data-tab="progress"><strong>Weekly check-in due.</strong> Measure your waist and tap here. One minute.</button>`;
  const hasData = Object.keys(S.daily).length + Object.keys(S.logs).length > 3;
  if (hasData && (!S.lastBackup || diffDays(S.lastBackup, t) >= 14)) out += `<button class="banner" data-act="backup"><strong>Back up your data.</strong> It only lives on this phone. Tap to save a backup file.</button>`;

  if (w < 1) {
    const p = S.prep || {};
    const n = diffDays(t, S.profile.startDate);
    const items = [['inbody', 'First InBody done (86.6 kg, 24.5% body fat)'], ['creatine', 'Buy creatine monohydrate (check the label, seal and expiry)'], ['tape', 'Buy a tape measure'], ['boxes', 'Buy 10–12 meal-prep boxes (in the shopping list)'], ['photos', 'Take front, side, back and neck photos (Progress > Photos)'], ['rhr', 'Check your resting heart rate in the Health app'], ['reminders', 'Add the reminders to your calendar (Settings)'], ['plan', 'Make the 2-week meal plan and shop Saturday'], ['bag', 'Pack the gym bag Saturday night']];
    out += `<h1 class="day">${n} day${n === 1 ? '' : 's'} to go</h1><p class="muted">Week 1 starts ${fmtDate(S.profile.startDate)} with Lower A at 6am. Until then, get set up.</p>
    <div class="block"><h3>Before you start</h3>${items.map(([id, l]) => check('prep', p[id], esc(l), `data-id="${id}"`)).join('')}
    <label class="f" for="bw">Starting waist at the belly button (cm)</label><div class="row"><input class="t" id="bw" inputmode="decimal" data-baseline="waist" value="${esc(S.baseline.waist ?? '')}" placeholder="e.g. 96"></div>
    <p class="small muted" style="margin:6px 0 0">Relaxed, after breathing out, tape level. This is how the app tells fat loss from a stall later.</p></div>
    <button class="btn block-w" data-act="opensession" data-sid="LA" data-date="${S.profile.startDate}">Preview Sunday's session</button>`;
    return out + foodToday(S, t) + dailyLog(S) + postureCard(S, ui.logDate || t);
  }
  if (isPaused(S, cw)) {
    out += `<h1 class="day">Paused week</h1><p class="muted">Sick, travelling or life. The plan waits for you and picks up next week where you left off.</p>
    <div class="block"><p>Keep protein up, walk, sleep. If you feel up to it, an easy swim or walk is fine.</p><button class="btn block-w" data-act="pause" data-cw="${cw}">I'm back, unpause this week</button></div>`;
    return out + foodToday(S, t) + dailyLog(S) + postureCard(S, ui.logDate || t);
  }
  const ph = phaseFor(w), kind = dayKind(t), wb = weekInBlock(w);
  if (wb === 1 && blockOf(w) > 1 && dow(t) === 0) out += `<div class="block alert"><h3>Block ${blockOf(w)} starts today</h3><p class="small">Same structure, your weights carry over. Compare your InBody, photos and run test from week 12 with week 1 in Progress.</p></div>`;
  out += `<p class="small muted" style="margin:0">${DOWL[dow(t)]}, ${fmtShort(t)}</p>`;
  const recsToday = S.logs[t] || {};
  if (SESSIONS[kind]) {
    const s = SESSIONS[kind], rec = recsToday[kind], done = rec?.done;
    out += `<h1 class="day">${s.n}</h1><p class="muted" style="margin-bottom:8px">${s.focus}</p><span class="phase">${ph.n}</span>
    <div class="block">${done ? `<p><strong>Session done.</strong> ${sessionSummary(rec)}</p><button class="btn block-w" data-act="opensession" data-sid="${kind}" data-date="${t}">Review session</button>` :
      `<p>${ph.rir}. ${ph.note}</p>${hr >= 9 ? `<div class="note"><strong>Missed the 6am slot?</strong> Do it at 6–7pm today. Same session, nothing else changes.</div>` : `<p class="small muted">6am slot. Your 20-minute brisk walk there is the warm-up. About 60–70 minutes in the gym.</p>`}
      <button class="btn primary block-w" data-act="opensession" data-sid="${kind}" data-date="${t}">${touched(rec) ? 'Continue session' : 'I\'m at the gym, start'}</button>`}</div>`;
    if (s.finisher && !done) { const f = finisher(w); out += `<p class="small muted">Then: ${esc(f.n)}.</p>`; }
    out += `<div class="block flat"><p class="small" style="margin:0"><strong>Eating before 6am:</strong> training empty is fine. If you feel weak, a banana or 2–3 dates with a glass of laban before you leave.</p></div>`;
  } else if (kind === 'THU') {
    const dn = doneInWeek(S, cw), missedU = ['UA', 'UB'].filter(x => !dn.has(x)), missedL = ['LA', 'LB'].filter(x => !dn.has(x));
    out += `<h1 class="day">Feel-good day</h1><p class="muted">No lifting. Football tonight.</p>
    <div class="block"><h3>Optional morning session</h3><p>Easy swim 15–20 minutes, light jog on the track for 10, some mobility. Sauna, steam and the cold jacuzzi are all fine today.</p><p class="small muted">Keep it easy. The goal is to arrive at football fresh. Log the football in today's log.</p></div>`;
    if (missedU.length) out += `<div class="block alert"><h3>Make-up option</h3><p>You missed ${missedU.map(x => SESSIONS[x].n).join(' and ')} this week. Do ${SESSIONS[missedU[0]].n} this morning instead of the swim. Skip the cold jacuzzi after it.</p><button class="btn primary block-w" data-act="opensession" data-sid="${missedU[0]}" data-date="${t}">${touched(recsToday[missedU[0]]) ? 'Continue' : 'Start'} ${SESSIONS[missedU[0]].n}</button></div>`;
    else if (missedL.length) out += `<div class="block flat"><p class="small" style="margin:0">You missed ${missedL.map(x => SESSIONS[x].n).join(' and ')}. Let it go. Football tonight covers your legs, and heavy legs before a match is how hamstrings get pulled.</p></div>`;
    else out += `<div class="block flat"><p class="small" style="margin:0">All four sessions done this week. That's the whole game.</p></div>`;
  } else {
    out += `<h1 class="day">Rest day</h1><p class="muted">No gym. Walk when you can.</p>
    <div class="block"><h3>Weekend in Makkah</h3><p>Big family or friends' meals are fine. Eat the protein first, go easy on rice and sweets, don't try to "make up" for it on Sunday by starving.</p></div>`;
  }
  // Other sessions logged today (e.g. a make-up)
  const extra = SESSION_IDS.filter(x => x !== kind && recsToday[x] && touched(recsToday[x]) && !(kind === 'THU'));
  for (const x of extra) out += `<button class="btn block-w" style="margin-top:8px" data-act="opensession" data-sid="${x}" data-date="${t}">${recsToday[x].done ? 'Review' : 'Continue'} ${SESSIONS[x].n} (make-up)</button>`;
  const tomorrow = dow(addDays(t, 1));
  if (hr >= 20 && [0, 1, 2, 3].includes(tomorrow)) out += `<div class="note"><strong>Training at 6am tomorrow.</strong> Aim to be asleep by 10:30–11.</div>`;
  return out + foodToday(S, t) + dailyLog(S) + postureCard(S, ui.logDate || t);
}

export const dailyKey = () => ui.logDate || today();
export { num };
