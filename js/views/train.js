import { app } from '../store.js';
import { ui, today } from '../ui.js';
import { esc, addDays, fmtDate, fmtShort, DOW, dow, num } from '../util.js';
import { EX, SESSIONS, DAYPLAN, planWeek, calWeek, calWeekOf, calWeekStart, isPaused, phaseFor, blockOf, weekInBlock, setsFor, finisher, doneInWeek, getRec, exRec, exName, defaultAlt, avail, lastPerf, suggestion, sessionSummary, touched } from '../training.js';

export function vPlan() {
  const S = app.S, t = today(), cur = planWeek(S, t);
  const w = ui.planWeek || Math.max(1, cur);
  const blk = blockOf(w), cw = calWeekOf(S, w), ph = phaseFor(w), dn = doneInWeek(S, cw);
  const first = (blk - 1) * 12;
  let out = `<h2 style="margin-top:4px">Training plan${blk > 1 ? ` · block ${blk}` : ''}</h2>
  <div class="weekpick">${blk > 1 ? `<button data-act="pickweek" data-w="${first}" aria-label="Previous block">‹</button>` : ''}${[...Array(12)].map((_, i) => `<button data-act="pickweek" data-w="${first + i + 1}" class="${first + i + 1 === w ? 'on' : ''} ${first + i + 1 === cur ? 'cur' : ''}" aria-label="Week ${i + 1}">${i + 1}</button>`).join('')}<button data-act="pickweek" data-w="${first + 13}" aria-label="Next block">›</button></div>
  <div class="block"><h3>Week ${weekInBlock(w)}: ${ph.n}</h3><p style="margin:0">${ph.rir}. ${ph.note}</p></div><div class="week">`;
  const start = calWeekStart(S, cw);
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i), kind = DAYPLAN[dow(k)];
    let name, st = '';
    if (SESSIONS[kind]) {
      name = SESSIONS[kind].n + (SESSIONS[kind].finisher ? ' + ' + (finisher(w).test ? 'run test' : 'intervals') : '');
      if (S.logs[k]?.[kind]?.done || dn.has(kind)) st = '<span class="status ok">Done</span>';
      else if (k < t) st = '<span class="status miss">Missed</span>';
    } else if (kind === 'THU') name = 'Feel-good swim + football'; else name = 'Rest, Makkah';
    out += `<button class="wday ${k === t ? 'today' : ''}" ${SESSIONS[kind] ? `data-act="opensession" data-sid="${kind}" data-date="${k}"` : 'disabled'}><span class="d">${DOW[dow(k)]}</span><span><strong>${esc(name)}</strong><br><span class="small muted">${fmtShort(k)}</span></span>${st}</button>`;
  }
  out += `</div>`;
  const tcw = calWeek(S, t);
  if (tcw >= 1) out += `<div class="block flat"><h3>Sick or travelling?</h3><p class="small">Pause this calendar week. The plan picks up where you left off next week instead of skipping ahead.</p><button class="btn block-w" data-act="pause" data-cw="${tcw}">${isPaused(S, tcw) ? 'Unpause this week' : 'Pause this week'}</button></div>`;
  out += `<h2>How progression works</h2><p>Every exercise has a rep range, like 8–10. Keep the same weight until you hit the top of the range on every set, then add the smallest jump next time. If a lift doesn't move for 3 sessions, the app tells you to drop 10% and build back, or swap it.</p>
  <p>Weeks 1, 6 and 12 have a 12-minute run test and an InBody, so progress is measured, not guessed. After week 12 a new block starts with the same structure and your weights carry over.</p>`;
  return out;
}

export function vSession() {
  const S = app.S, { sid, date } = ui.route, s = SESSIONS[sid], t = today();
  const w = Math.max(1, planWeek(S, date));
  const future = date > t;
  const rec = future ? null : getRec(S, date, sid, false);
  const ph = phaseFor(w);
  let out = `<button class="btn sm ghost" data-act="back">← Back</button><h1 class="day" style="margin-top:10px">${s.n}</h1><p class="muted">${s.focus}. Week ${weekInBlock(w)}${blockOf(w) > 1 ? ` of block ${blockOf(w)}` : ''}, ${ph.n.toLowerCase()}. ${ph.rir}.</p>`;
  if (future) out += `<div class="note">Preview of ${fmtDate(date)}. ${planWeek(S, t) >= 1 ? `<button class="btn sm" data-act="dotoday" data-sid="${sid}">Do it today instead</button>` : ''}</div>`;
  else if (date < t) out += `<div class="note">Logging ${fmtDate(date)}. Fill in what you did that day.</div>`;
  out += `<div class="block">`;
  for (const id of s.ex) {
    const e = EX[id], n = setsFor(id, w);
    const x = rec?.ex?.[id] ? rec.ex[id] : { alt: defaultAlt(S, id), sets: [] };
    const sets = [...Array(n)].map((_, i) => x.sets[i] || { w: '', r: '', done: false });
    const name = exName(id, x.alt), lp = lastPerf(S, id, name, date), sug = suggestion(S, id, name, date, w);
    out += `<div class="ex"><div class="ex-head"><div><div class="ex-name">${esc(name)}</div>${x.alt >= 0 ? `<div class="ex-swapped">Swapped from ${esc(e.n)}</div>` : ''}</div><div class="dose">${n}×${esc(e.reps)}<small>rest ${e.rest >= 120 ? (e.rest / 60) + ' min' : e.rest + ' s'}</small></div></div>
    <p class="cue">${esc(e.cue)}</p>
    ${lp ? `<p class="last"><b>Last time (${fmtShort(lp.date)}):</b> ${lp.sets.map(q => `${q.w || 'BW'}×${q.r}`).join(', ')}.${sug ? ` <span class="${sug.stall ? 'warn' : ''}">${esc(sug.t)}</span>` : ''}</p>` : ''}
    <div class="sets"><div class="set small muted"><span></span><span>kg${e.bw ? ' (optional)' : ''}</span><span>reps</span><span></span></div>
    ${sets.map((q, i) => `<div class="set"><span class="n">${i + 1}</span><input inputmode="decimal" aria-label="Set ${i + 1} weight" data-set="${id}|${i}|w" value="${esc(q.w)}" placeholder="${lp ? esc(lp.sets[Math.min(i, lp.sets.length - 1)].w || '') : ''}" ${future ? 'disabled' : ''}><input inputmode="numeric" aria-label="Set ${i + 1} reps" data-set="${id}|${i}|r" value="${esc(q.r)}" placeholder="${esc(String(e.reps).split(/[–\s]/)[0])}" ${future ? 'disabled' : ''}><button class="tick ${q.done ? 'done' : ''}" data-act="setdone" data-id="${id}" data-i="${i}" aria-label="Set ${i + 1} done" ${future ? 'disabled' : ''}>✓</button></div>`).join('')}</div>
    ${future ? '' : `<div class="row wrapflex" style="margin-top:10px"><button class="btn sm" data-act="swap" data-id="${id}">Machine busy? Swap</button><button class="btn sm ghost" data-act="askcoach" data-q="busy">Ask Claude</button></div>`}
    ${ui.openSwap === id ? `<div class="alts"><span class="small muted">Pick a swap. Greyed out = not in your gym.</span>${[[e.n, e.eq, -1], ...e.alts.map((a, i) => [a[0], a[1], i])].map(([nm, eq, i]) => `<button class="alt ${avail(S, eq) ? '' : 'na'} ${x.alt === i ? 'cur' : ''}" data-act="pickalt" data-id="${id}" data-i="${i}"><span>${esc(nm)}</span><span class="small muted">${x.alt === i ? 'Current' : avail(S, eq) ? 'Use this' : 'Not available'}</span></button>`).join('')}<p class="small muted" style="margin:0">Or skip ahead: do the next exercise and come back when it's free.</p></div>` : ''}
    </div>`;
  }
  out += `</div>`;
  if (s.finisher) { const f = finisher(w); out += `<div class="block"><h3>Finisher: ${esc(f.n)}</h3><p style="margin:0">${esc(f.d)}</p>${f.test ? '<button class="btn block-w" style="margin-top:10px" data-act="go" data-tab="progress">Log the run distance</button>' : ''}</div>`; }
  if (!future) {
    if (rec?.done) out += `<div class="block"><p><strong>Finished.</strong> ${sessionSummary(rec)}</p><p class="small muted">Sauna or hot jacuzzi is fine now. Skip the cold jacuzzi after lifting. Breakfast with protein within the next couple of hours.</p><button class="btn sm ghost" data-act="unfinish">Reopen session</button></div>`;
    else out += `<button class="btn primary block-w" data-act="finish" ${touched(rec) ? '' : 'disabled'}>Finish session</button>${touched(rec) ? '' : '<p class="small muted" style="text-align:center">Tick at least one set to finish.</p>'}`;
  }
  return out;
}

// Write a value into a set, creating the record only when something is actually logged.
export function writeSet(id, i, f, v) {
  const S = app.S, { sid, date } = ui.route, w = Math.max(1, planWeek(S, date));
  const rec = getRec(S, date, sid, true), x = exRec(S, rec, id, w);
  x.sets[i][f] = v;
  return { rec, x, set: x.sets[i] };
}
export { num };
