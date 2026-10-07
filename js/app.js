import { app, load, save, flush, replaceState, resetLogs } from './store.js';
import { ui, setRender, render, toast, go, today, armed, copyText, saveFile } from './ui.js';
import { num, r1, addDays, esc, rng } from './util.js';
import { EX, planWeek, calWeek, getRec, exRec, exName, touched } from './training.js';
import { evaluate, applyDelta, weightAvg } from './adapt.js';
import { generateCycle, cycleFor, recipe, allRecipes, slotRid, CYCLE_DAYS } from './mealplan.js';
import { statusText, recipePrompt, parseImport, QUESTIONS } from './status.js';
import { buildICS } from './ics.js';
import { addPhoto, listPhotos, deletePhoto, importPhotos } from './photos.js';
import { vToday, EAT_OUT, ACTS, dailyKey } from './views/today.js';
import { vPlan, vSession, writeSet } from './views/train.js';
import { vFood, vRecipe } from './views/food.js';
import { vProgress } from './views/progress.js';
import { vCoach } from './views/coach.js';
import { vSettings, icsSel } from './views/settings.js';

const $ = s => document.querySelector(s);
const VIEWS = { today: vToday, plan: vPlan, session: vSession, food: vFood, recipe: vRecipe, progress: vProgress, coach: vCoach, settings: vSettings };
const TAB_OF = { session: 'plan', recipe: 'food', settings: null };

function setSub() {
  const S = app.S, t = today(), w = planWeek(S, t);
  $('#sub').textContent = w < 1 ? `Plan starts ${new Date(S.profile.startDate + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : `Week ${((w - 1) % 12) + 1} of 12${w > 12 ? ` · block ${Math.ceil(w / 12)}` : ''}`;
}
function doRender(keepScroll) {
  setSub();
  const tab = ui.route.tab, navTab = tab in TAB_OF ? (tab === 'session' && ui.route.from === 'today' ? 'today' : TAB_OF[tab]) : tab;
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === navTab));
  const sy = window.scrollY;
  let html;
  try { html = (VIEWS[tab] || vToday)(); }
  catch (e) { console.error(e); html = `<div class="block alert"><h3>Something went wrong on this screen</h3><p class="small">${esc(e.message)}</p><button class="btn" data-act="go" data-tab="today">Back to Today</button></div>`; }
  $('#view').innerHTML = html;
  if (keepScroll) window.scrollTo(0, sy); else window.scrollTo(0, 0);
  if (tab === 'progress' && ui.photos == null) listPhotos().then(p => { ui.photos = p; if (ui.route.tab === 'progress') render(); }).catch(() => { ui.photos = []; });
}
setRender(doRender);
app.onSaveError = () => toast('Couldn\'t save. Phone storage may be full.');

/* ---------- Rest timer (wall-clock based, survives the screen locking) ---------- */
let timerEnd = 0, timerInt = null, audioCtx = null;
function beep() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.35); } catch (e) { /* no audio */ } }
function startTimer(sec, label) { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch (e) { /* no audio */ } timerEnd = Date.now() + sec * 1000; $('#timerLabel').textContent = 'Rest · ' + label; $('#timer').classList.add('show'); clearInterval(timerInt); timerInt = setInterval(tick, 250); tick(); }
function tick() {
  const ms = timerEnd - Date.now();
  if (ms <= 0) { $('#timerClock').textContent = 'Go'; clearInterval(timerInt); timerInt = null; beep(); navigator.vibrate?.([200, 100, 200]); setTimeout(() => { if (!timerInt) $('#timer').classList.remove('show'); }, 5000); return; }
  const s = Math.ceil(ms / 1000); $('#timerClock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else { if (timerInt) tick(); render(); } });

/* ---------- Helpers ---------- */
const S = () => app.S;
function daily(k = dailyKey()) { const s = S(); s.daily[k] = s.daily[k] || {}; return s.daily[k]; }
const seedOf = str => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function makeCycle(start, fresh) {
  const s = S(), prev = (s.meal.cycles || []).find(c => c.start === addDays(start, -CYCLE_DAYS));
  const c = generateCycle(s, start, seedOf(start) + (fresh ? Date.now() % 100000 : 0), prev);
  s.meal.cycles = (s.meal.cycles || []).filter(x => x.start !== start).concat([c]).sort((a, b) => a.start < b.start ? -1 : 1).slice(-6);
  save(); return c;
}
function swapMeal(c, d, meal) {
  const s = S(), slot = c.days[d]?.[meal]; if (!slot) return;
  const all = allRecipes(s);
  if (slot.cook != null) {
    const ck = c.cooks[slot.cook], role = slot.role, cur = ck[role];
    const one = (s.profile.cookMode || 'one') !== 'two';
    const pool = all.filter(r => r.kind === 'batch' && r.slots.includes(role === 'a' ? 'lunch' : 'dinner') && !(role === 'a' && one && !r.slots.includes('dinner')));
    const inUse = new Set(c.cooks.flatMap(k => [k.a, k.b]));
    const idx = pool.findIndex(r => r.id === cur);
    for (let i = 1; i <= pool.length; i++) { const r = pool[(idx + i) % pool.length]; if (!inUse.has(r.id) || i === pool.length) { ck[role] = r.id; break; } }
    toast(`${s.profile.cookDays.length ? 'Cook night' : 'Batch'} dish changed to ${recipe(s, ck[role]).n}`);
  } else {
    const r0 = recipe(s, slot.rid);
    const pool = all.filter(r => r.slots.includes(meal) && (meal === 'breakfast' || meal === 'snack' || r.kind === 'nocook'));
    const idx = pool.findIndex(r => r.id === r0?.id);
    slot.rid = pool[(idx + 1) % pool.length].id;
  }
  save();
}

/* ---------- Actions ---------- */
const ACT = {
  go: t => go({ tab: t.dataset.tab }),
  back: () => { if (history.state && history.length > 1) history.back(); else go({ tab: ui.route.from || 'today' }); },
  food: t => { ui.foodTab = t.dataset.sub; if (ui.route.tab !== 'food') go({ tab: 'food' }); else render(false); },
  recipe: t => go({ tab: 'recipe', id: t.dataset.id, n: 1 }),
  portions: t => { ui.route.n = +t.dataset.n; render(); },
  logday: t => { const d = +t.dataset.d, t0 = today(); ui.logDate = d === 0 ? null : addDays(dailyKey(), d); if (ui.logDate && ui.logDate >= t0) ui.logDate = null; render(); },
  dailyseg: t => { daily()[t.dataset.f] = t.dataset.v; save(); render(); },
  dailytick: t => { const d = daily(); d[t.dataset.f] = !d[t.dataset.f]; save(); render(); },
  addact: () => { const m = num($('#actM').value); if (!m) { toast('Type the minutes'); return; } const d = daily(); (d.acts = d.acts || []).push({ t: $('#actT').value, min: Math.round(m) }); save(); render(); },
  delact: t => { daily().acts.splice(+t.dataset.i, 1); save(); render(); },
  addoff: t => { const [n, kcal] = EAT_OUT[+t.dataset.i]; const d = daily(); (d.offplan = d.offplan || []).push({ n, kcal }); if (!d.food) d.food = 'partly'; save(); toast('Logged. Get back on plan at the next meal.'); render(); },
  deloff: t => { daily().offplan.splice(+t.dataset.i, 1); save(); render(); },
  prep: t => { const s = S(); s.prep[t.dataset.id] = !s.prep[t.dataset.id]; save(); render(); },
  opensession: t => go({ tab: 'session', sid: t.dataset.sid, date: t.dataset.date, from: ui.route.tab === 'today' ? 'today' : 'plan' }),
  dotoday: t => go({ tab: 'session', sid: t.dataset.sid, date: today(), from: ui.route.from }),
  pickweek: t => { const w = +t.dataset.w; if (w < 1) return; ui.planWeek = w; render(); },
  pause: t => { const s = S(), cw = +t.dataset.cw; s.pausedWeeks = s.pausedWeeks.includes(cw) ? s.pausedWeeks.filter(x => x !== cw) : s.pausedWeeks.concat([cw]); save(); toast(s.pausedWeeks.includes(cw) ? 'Week paused. Get well.' : 'Week unpaused'); render(); },
  setdone: t => {
    const s = S(), id = t.dataset.id, i = +t.dataset.i, { sid, date } = ui.route;
    const x = exRec(s, getRec(s, date, sid, true), id, Math.max(1, planWeek(s, date))), set = x.sets[i];
    if (!set.done) {
      const row = t.closest('.set'), rIn = row.querySelector('[data-set$="|r"]'), wIn = row.querySelector('[data-set$="|w"]');
      set.r = rIn.value; set.w = wIn.value;
      if (!num(set.r)) { toast('Type how many reps you did first'); rIn.focus(); return; }
      set.done = true;
      startTimer(EX[id].rest, exName(id, x.alt));
    } else set.done = false;
    save(); render();
  },
  swap: t => { ui.openSwap = ui.openSwap === t.dataset.id ? null : t.dataset.id; render(); },
  pickalt: t => { const s = S(), { sid, date } = ui.route; const x = exRec(s, getRec(s, date, sid, true), t.dataset.id, Math.max(1, planWeek(s, date))); x.alt = +t.dataset.i; ui.openSwap = null; save(); render(); },
  finish: () => { const s = S(), rec = getRec(s, ui.route.date, ui.route.sid, true); if (!touched(rec)) return; rec.done = true; rec.finishedAt = new Date().toISOString(); save(); $('#timer').classList.remove('show'); toast('Session saved'); render(); },
  unfinish: () => { const rec = getRec(S(), ui.route.date, ui.route.sid, true); rec.done = false; save(); render(); },
  timeradd: () => { timerEnd += 30000; if (!timerInt) timerInt = setInterval(tick, 250); tick(); },
  timerstop: () => { clearInterval(timerInt); timerInt = null; $('#timer').classList.remove('show'); },
  equip: t => { const s = S(); s.equipment[t.dataset.id] = s.equipment[t.dataset.id] === false; save(); render(); },
  checkin: () => {
    const s = S(), t = today(), waist = $('#ciw').value, rhr = $('#cih').value, note = $('#cin').value;
    const r = evaluate(s, t, waist); ui.ciResult = r;
    const avg = weightAvg(s, t, 0);
    s.checkins = s.checkins.filter(c => c.date !== t);
    s.checkins.push({ date: t, week: planWeek(s, t), avg: avg != null ? r1(avg) : null, waist: num(waist), rhr: num(rhr), note, verdict: r.verdict, kcal: s.profile.kcal });
    save(); render();
  },
  applykcal: t => { const s = S(), nk = applyDelta(s.profile.kcal, +t.dataset.d); s.kcalHistory.push({ date: today(), kcal: nk, reason: ui.ciResult ? ui.ciResult.verdict : 'Check-in' }); s.profile.kcal = nk; ui.ciResult = null; save(); toast(`New target ${nk} kcal. Meal portions updated.`); render(); },
  addinbody: () => {
    const v = id => num($('#' + id)?.value);
    if (v('ib_weight') == null || v('ib_pbf') == null) { toast('Weight and body fat % are needed'); return; }
    const seg = p => { const o = {}; for (const k of ['armL', 'armR', 'trunk', 'legL', 'legR']) { const x = v(p + k); if (x != null) o[k] = x; } return Object.keys(o).length ? o : undefined; };
    const w = v('ib_weight'), pbf = v('ib_pbf');
    S().inbody.push({ date: today(), weight: w, pbf, smm: v('ib_smm'), bfm: v('ib_bfm') ?? r1(w * pbf / 100), visceral: v('ib_visceral'), whr: v('ib_whr'), score: v('ib_score'), segMuscle: seg('ibm_'), segFat: seg('ibf_') });
    save(); toast('InBody saved'); render();
  },
  addtest: () => { const m = num($('#testm').value); if (m == null) return; const s = S(), t = today(); s.tests.push({ week: ((Math.max(1, planWeek(s, t)) - 1) % 12) + 1, date: t, m: Math.round(m) }); save(); toast('Run test saved'); render(); },
  delphoto: async t => { if (!armed(t, 'tap again')) return; await deletePhoto(t.dataset.id); ui.photos = await listPhotos(); render(); },
  copystatus: async t => {
    const q = QUESTIONS.find(x => x[0] === t.dataset.q);
    let question = q[2];
    if (q[0] === 'custom') { question = ($('#askq')?.value || ui.ask || '').trim(); if (!question) { toast('Type your question first'); return; } }
    const text = statusText(S(), today(), question);
    const ok = await copyText(text);
    ui.copied = { ok, text };
    if (ui.route.tab !== 'coach') go({ tab: 'coach' }); else render();
    requestAnimationFrame(() => document.getElementById('copied')?.scrollIntoView({ block: 'center' }));
  },
  askcoach: t => ACT.copystatus(t),
  copyclose: () => { ui.copied = null; render(); },
  copyrecipes: async () => { const text = recipePrompt(S(), ($('#reca')?.value || '').trim()); const ok = await copyText(text); ui.copied = { ok, text }; render(); requestAnimationFrame(() => document.getElementById('copied')?.scrollIntoView({ block: 'center' })); },
  importrecipes: () => {
    const s = S(), txt = $('#paste')?.value || '';
    if (!txt.trim()) { toast('Paste Claude\'s answer first'); return; }
    const { recipes, foods, errors } = parseImport(s, txt);
    Object.assign(s.customFoods, foods); s.customRecipes.push(...recipes); save();
    ui.importMsg = (recipes.length ? `<strong>Loaded ${recipes.length} recipe${recipes.length > 1 ? 's' : ''}:</strong> ${recipes.map(r => esc(r.n)).join(', ')}. The next plan you make can use them (or tap ⇄ on a meal).` : '<strong>Nothing loaded.</strong>') + (errors.length ? '<br><span class="small">' + errors.map(esc).join('<br>') + '</span>' : '');
    render();
  },
  delrecipe: t => { if (!armed(t, '?')) return; const s = S(); s.customRecipes = s.customRecipes.filter(r => r.id !== t.dataset.id); for (const c of s.meal.cycles) { const used = Object.values(c.days).some(d => Object.values(d).some(sl => slotRid(c, sl) === t.dataset.id)); if (used) toast('Removed. Regenerate the plan to replace it where it was used.'); } save(); render(); },
  gencycle: t => { makeCycle(t.dataset.start, false); toast('2-week plan ready'); render(); },
  regen: t => { if (!armed(t, 'Tap again: new recipes')) return; makeCycle(t.dataset.c, true); toast('New recipes picked'); render(); },
  swapmeal: t => { const c = S().meal.cycles.find(x => x.start === t.dataset.c); if (c) { swapMeal(c, t.dataset.d, t.dataset.m); render(); } },
  gotit: t => { const c = S().meal.cycles.find(x => x.start === t.dataset.c); c.got = c.got || {}; c.got[t.dataset.id] = !c.got[t.dataset.id]; save(); render(); },
  haveit: t => { const c = S().meal.cycles.find(x => x.start === t.dataset.c); c.have = c.have || {}; c.have[t.dataset.id] = !c.have[t.dataset.id]; save(); render(); },
  daytoggle: t => { const P = S().profile, f = t.dataset.f, v = +t.dataset.v; P[f] = P[f].includes(v) ? P[f].filter(x => x !== v) : P[f].concat([v]).sort(); save(); render(); },
  cookmode: t => { S().profile.cookMode = t.dataset.v; save(); render(); },
  awaytoggle: () => { const P = S().profile; P.awayMeals = (P.awayMeals || []).includes('4:dinner') ? P.awayMeals.filter(x => x !== '4:dinner') : (P.awayMeals || []).concat(['4:dinner']); save(); render(); },
  icstoggle: t => { icsSel[t.dataset.k] = !icsSel[t.dataset.k]; render(); },
  ics: async () => { const txt = buildICS(S(), today(), icsSel); await saveFile('farouks-coach-reminders.ics', txt, 'text/calendar'); },
  backup: async () => {
    const s = S(); let photos = []; try { photos = await listPhotos(); } catch (e) { /* none */ }
    const ok = await saveFile(`farouks-coach-backup-${today()}.json`, JSON.stringify({ app: 'farouks-coach', exported: new Date().toISOString(), state: s, photos }), 'application/json');
    if (ok) { s.lastBackup = today(); save(); toast('Backup saved'); render(); }
  },
  reset: t => { if (!armed(t, 'Tap again to erase everything')) return; resetLogs(); ui.ciResult = null; toast('Erased'); render(); }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const f = ACT[t.dataset.act]; if (!f) return;
  e.preventDefault();
  try { const r = f(t, e); if (r?.catch) r.catch(err => { console.error(err); toast('Something went wrong: ' + err.message); }); }
  catch (err) { console.error(err); toast('Something went wrong: ' + err.message); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.set) { const [id, i, f] = t.dataset.set.split('|'); writeSet(id, +i, f, t.value); save(); }
  else if (t.dataset.daily) { daily()[t.dataset.daily] = t.value; save(); }
  else if (t.dataset.baseline) { const s = S(); s.baseline[t.dataset.baseline] = num(t.value); s.baseline.date = today(); save(); }
  else if (t.dataset.ui) ui[t.dataset.ui] = t.value;
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.prof) {
    const P = S().profile, k = t.dataset.prof; let v = t.value;
    if (['kcal', 'protein', 'budget', 'goalWeight', 'age', 'shopDay'].includes(k)) { v = num(v); if (v == null) return; }
    if (k === 'kcal' && v !== P.kcal) S().kcalHistory.push({ date: today(), kcal: v, reason: 'Changed by hand in Settings', auto: false });
    P[k] = v; save(); render();
  } else if (t.dataset.price) { const v = num(t.value); if (v == null || v <= 0) return; S().prices[t.dataset.price] = v; save(); render(); }
  else if (t.dataset.photo) {
    const f = t.files?.[0]; t.value = ''; if (!f) return;
    try { await addPhoto(today(), t.dataset.photo, f); ui.photos = await listPhotos(); toast('Photo saved'); render(); }
    catch (err) { console.error(err); toast('Couldn\'t save that photo'); }
  } else if (t.dataset.restore) {
    const f = t.files?.[0]; t.value = ''; if (!f) return;
    try { const data = JSON.parse(await f.text()); replaceState(data.state || data); if (data.photos) await importPhotos(data.photos); ui.photos = null; toast('Backup restored'); render(); }
    catch (err) { toast(err.message || 'That file couldn\'t be read'); }
  }
});
window.addEventListener('popstate', e => { ui.route = e.state?.route || { tab: 'today' }; ui.openSwap = null; render(false); });

/* ---------- Boot ---------- */
load();
try { history.replaceState({ route: ui.route }, ''); } catch (e) { /* ignore */ }
render(false);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
// Re-render after midnight so "today" moves on if the app stays open.
setInterval(() => { const k = today(); if (k !== ACT._day) { ACT._day = k; render(); } }, 60000); ACT._day = today();
export { calWeek, cycleFor, rng, ACTS };
