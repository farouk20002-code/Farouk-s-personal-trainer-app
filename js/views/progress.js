import { app } from '../store.js';
import { ui, today, stat } from '../ui.js';
import { esc, num, r1, fmtShort, pkey, addDays } from '../util.js';
import { planWeek, weekInBlock, allRecs, exName, history, stalled, EX } from '../training.js';
import { stats } from '../adapt.js';
import { progress, BADGES } from '../game.js';

function weightChart(S) {
  const pts = Object.entries(S.daily).filter(([, v]) => num(v.weight) != null).map(([k, v]) => [k, num(v.weight)]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const first = S.inbody[0]; if (first && !pts.some(p => p[0] === first.date)) pts.unshift([first.date, first.weight]);
  if (pts.length < 2) return `<p class="small muted">Log your morning weight on Today and your trend shows up here.</p>`;
  const W = 340, H = 170, p = 28, xs = pts.map(x => pkey(x[0]).getTime()), ys = pts.map(x => x[1]);
  const goal = S.profile.goalWeight;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.floor(Math.min(...ys) - 0.5), y1 = Math.ceil(Math.max(...ys) + 0.5);
  const X = t => p + (x1 === x0 ? 0 : (t - x0) / (x1 - x0)) * (W - p - 8), Y = v => 8 + (y1 - v) / (y1 - y0 || 1) * (H - p - 8);
  const av = pts.map((q, i) => { const t = xs[i]; const win = pts.filter((r, j) => xs[j] <= t && xs[j] > t - 7 * 864e5).map(r => r[1]); return [t, win.reduce((a, b) => a + b, 0) / win.length]; });
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend"><g font-size="10" fill="var(--muted)">`;
  for (let v = y0; v <= y1; v += Math.max(1, Math.round((y1 - y0) / 4))) svg += `<line x1="${p}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="2" y="${Y(v) + 3}">${v}</text>`;
  svg += `</g>${pts.map((q, i) => `<circle cx="${X(xs[i])}" cy="${Y(q[1])}" r="2.6" fill="var(--muted)" opacity=".55"/>`).join('')}<polyline fill="none" stroke="var(--red)" stroke-width="2.5" stroke-linejoin="round" points="${av.map(a => X(a[0]) + ',' + Y(a[1])).join(' ')}"/></svg>`;
  const last = av[av.length - 1][1];
  return svg + `<p class="small muted">Dots are daily weigh-ins. The red line is the 7-day average, the only one that matters. ${goal ? `${r1(last - goal)} kg to the InBody target of ${goal} kg.` : ''}</p>`;
}

function inbodyBlock(S) {
  const base = S.inbody[0], last = S.inbody[S.inbody.length - 1];
  const seg = (o, k) => o?.[k] != null ? o[k] + '%' : '–';
  let out = `<div class="block"><h3>InBody</h3><div class="tablewrap"><table class="t"><tr><th>Date</th><th class="num">kg</th><th class="num">Fat %</th><th class="num">Muscle</th><th class="num">Fat kg</th><th class="num">Visc.</th></tr>${S.inbody.map(i => `<tr><td>${fmtShort(i.date)}</td><td class="num">${i.weight}</td><td class="num">${i.pbf}</td><td class="num">${i.smm ?? '–'}</td><td class="num">${i.bfm ?? '–'}</td><td class="num">${i.visceral ?? '–'}</td></tr>`).join('')}</table></div>`;
  if (S.inbody.length > 1) out += `<p class="small" style="margin-top:8px">Since the start: ${r1(last.bfm - base.bfm)} kg fat, ${r1(last.smm - base.smm) >= 0 ? '+' : ''}${r1(last.smm - base.smm)} kg muscle.</p>`;
  else out += `<p class="small muted" style="margin-top:8px">Next scans: week 6 and week 12. Same routine every time: nothing after lunch, scan around 6pm.</p>`;
  out += `<details><summary>Muscle and fat by body part</summary><p class="small muted">Muscle: 100% = normal for your height. Your arms and trunk are the priority; legs are already above normal.</p><div class="tablewrap"><table class="t"><tr><th></th><th class="num">L arm</th><th class="num">R arm</th><th class="num">Trunk</th><th class="num">L leg</th><th class="num">R leg</th></tr>
  ${S.inbody.filter(i => i.segMuscle).map(i => `<tr><td>Muscle ${fmtShort(i.date)}</td><td class="num">${seg(i.segMuscle, 'armL')}</td><td class="num">${seg(i.segMuscle, 'armR')}</td><td class="num">${seg(i.segMuscle, 'trunk')}</td><td class="num">${seg(i.segMuscle, 'legL')}</td><td class="num">${seg(i.segMuscle, 'legR')}</td></tr>`).join('')}
  ${S.inbody.filter(i => i.segFat).map(i => `<tr><td>Fat ${fmtShort(i.date)}</td><td class="num">${seg(i.segFat, 'armL')}</td><td class="num">${seg(i.segFat, 'armR')}</td><td class="num">${seg(i.segFat, 'trunk')}</td><td class="num">${seg(i.segFat, 'legL')}</td><td class="num">${seg(i.segFat, 'legR')}</td></tr>`).join('')}</table></div></details>
  <details><summary>Add an InBody result</summary><div class="grid2">
  ${[['ib_weight', 'Weight kg'], ['ib_pbf', 'Body fat %'], ['ib_smm', 'Skeletal muscle kg'], ['ib_bfm', 'Fat mass kg'], ['ib_visceral', 'Visceral level'], ['ib_whr', 'Waist-hip ratio'], ['ib_score', 'InBody score']].map(([id, l]) => `<div><label class="f" for="${id}">${l}</label><input class="t" id="${id}" inputmode="decimal"></div>`).join('')}</div>
  <p class="small muted" style="margin:10px 0 0">Optional, from the body-part diagrams (the % numbers):</p><div class="grid3">
  ${[['armL', 'L arm'], ['armR', 'R arm'], ['trunk', 'Trunk'], ['legL', 'L leg'], ['legR', 'R leg']].map(([k, l]) => `<div><label class="f" for="ibm_${k}">${l} muscle %</label><input class="t" id="ibm_${k}" inputmode="decimal"></div><div><label class="f" for="ibf_${k}">${l} fat %</label><input class="t" id="ibf_${k}" inputmode="decimal"></div>`).join('')}</div>
  <button class="btn block-w" style="margin-top:12px" data-act="addinbody">Save InBody</button></details></div>`;
  return out;
}

function liftsBlock(S) {
  const seen = new Map();
  for (const { rec } of allRecs(S)) for (const [id, x] of Object.entries(rec.ex || {})) { const n = exName(id, x.alt); seen.set(id + '|' + n, [id, n]); }
  const rows = [...seen.values()].map(([id, n]) => { const h = history(S, id, n); return h.length ? { id, n, h, st: stalled(S, id, n, '9999') } : null; }).filter(Boolean);
  if (!rows.length) return '';
  const main = rows.filter(r => EX[r.id].kind === 'main' || r.st);
  return `<div class="block"><h3>Main lifts</h3>${main.map(r => { const a = r.h[0].best, b = r.h[r.h.length - 1].best; return stat(`${esc(r.n)}${r.st ? ' <span class="warn small">· stalled</span>' : ''}<br><span class="small muted">${r.h.length} sessions, estimated max</span>`, `${Math.round(a)} → ${Math.round(b)}${EX[r.id].bw ? '' : ' kg'}`); }).join('')}
  <p class="small muted" style="margin:8px 0 0">Estimated 1-rep max from your best set each session. Stalled = no progress in 3 sessions.</p></div>`;
}

function photosBlock() {
  const P = ui.photos;
  let out = `<div class="block"><h3>Progress photos</h3><p class="small muted">Same spot, same light, morning, same clothes. Front, side and back every 4 weeks, and a side photo of your neck to watch the bump.</p>
  <div class="grid2">${[['front', 'Front'], ['side', 'Side'], ['back', 'Back'], ['neck', 'Neck, side']].map(([k, l]) => `<label class="btn" for="ph_${k}">+ ${l}</label><input type="file" id="ph_${k}" accept="image/*" hidden data-photo="${k}">`).join('')}</div>`;
  if (P == null) out += `<p class="small muted">Loading photos…</p>`;
  else if (!P.length) out += `<p class="small muted" style="margin-top:10px">No photos yet.</p>`;
  else {
    for (const pose of ['front', 'side', 'back', 'neck']) {
      const list = P.filter(p => p.pose === pose); if (!list.length) continue;
      const a = list[0], b = list[list.length - 1];
      out += `<h3 style="margin-top:14px;text-transform:capitalize">${pose}</h3><div class="photos">${[a, b !== a ? b : null].filter(Boolean).map(p => `<figure><img src="${p.data}" alt="${pose} ${p.date}"><figcaption class="small muted">${fmtShort(p.date)} <button class="linkbtn" data-act="delphoto" data-id="${p.id}">delete</button></figcaption></figure>`).join('')}</div>${list.length > 2 ? `<p class="small muted">${list.length} photos, showing first and latest.</p>` : ''}`;
    }
  }
  return out + `</div>`;
}

export function vProgress() {
  const S = app.S, t = today(), w = planWeek(S, t), st = stats(S, t);
  const r = ui.ciResult;
  const g = progress(S, t), got = new Set(g.earned);
  let out = `<h2 style="margin-top:4px">Progress</h2>
  <div class="block trophy"><div class="row between"><div><div class="kicker">Level ${g.lv.level}</div><div class="lvbig">${g.lv.name}</div></div><div class="xptotal"><b>${g.xp.toLocaleString('en-GB')}</b><span>total XP</span></div></div>
  <div class="xpbar wide"><i style="width:${Math.round(g.lv.into / g.lv.need * 100)}%"></i></div><p class="tiny muted" style="margin:6px 0 0">${g.lv.need - g.lv.into} XP to level ${g.lv.level + 1}</p>
  <div class="sumgrid" style="margin-top:14px"><div><b>🔥 ${g.st.weeks}</b><span>perfect weeks</span></div><div><b>🏆 ${g.prs}</b><span>lift records</span></div><div><b>🎖️ ${got.size}/${BADGES.length}</b><span>badges</span></div></div>
  <details><summary>How to earn XP</summary><div class="small">${[['Finish a session', 50], ['Beat a lift record', 25], ['Close a ring', 10], ['Close all rings in a day', '+25'], ['Cook night done', 30], ['Big cook night', 60], ['Weekly check-in', 40], ['InBody or run test', 50]].map(([a, b]) => stat(a, b + ' XP')).join('')}</div></details></div>
  <div class="badges">${BADGES.map(b => `<div class="badge ${got.has(b.id) ? 'got' : ''}" title="${esc(b.d)}"><span class="bicon">${got.has(b.id) ? b.icon : '🔒'}</span><b>${esc(b.n)}</b><span>${esc(b.d)}</span></div>`).join('')}</div>
  <div class="block"><h3>Weight</h3>${weightChart(S)}</div>
  <div class="block"><h3>Weekly check-in${w >= 1 ? ` · week ${weekInBlock(w)}` : ''}</h3><p class="small muted">Saturday morning. The app reads your last 3 weeks and tells you what to change.</p>
  <div class="grid2"><div><label class="f" for="ciw">Waist at belly button (cm)</label><input class="t" id="ciw" inputmode="decimal" placeholder="e.g. 96"></div><div><label class="f" for="cih">Resting heart rate</label><input class="t" id="cih" inputmode="numeric" placeholder="from Health"></div></div>
  <label class="f" for="cin">Anything to note?</label><input class="t" id="cin" placeholder="Felt tired, missed Monday…">
  <button class="btn primary block-w" style="margin-top:12px" data-act="checkin">Run check-in</button>
  ${r ? `<div class="verdictbox"><div class="verdict">${esc(r.verdict)}</div><p style="margin-top:6px">${esc(r.text)}</p>${r.delta ? `<button class="btn primary block-w" data-act="applykcal" data-d="${r.delta}">Change to ${Math.max(1900, S.profile.kcal + r.delta)} kcal and update my meals</button>` : ''}<details><summary>What the app looked at</summary><ul class="small">${r.why.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details></div>` : ''}</div>
  <div class="block"><h3>Last 7 days</h3>${stat('Sessions done', `${st.sessions} of ${st.planned}`)}${stat('Average weight', st.w0 != null ? r1(st.w0) + ' kg' : 'need 3+ weigh-ins')}${stat('Average steps', st.steps != null ? Math.round(st.steps).toLocaleString('en-GB') : 'no logs')}${stat('Average sleep', st.sleep != null ? r1(st.sleep) + ' h' : 'no logs')}${stat('Ate to plan', st.food != null ? Math.round(st.food * 100) + '%' : 'no logs')}${stat('Calorie target', S.profile.kcal + ' kcal')}</div>`;
  if (S.checkins.length) out += `<div class="block"><h3>Check-in history</h3>${S.checkins.slice().reverse().map(c => stat(`${fmtShort(c.date)}: ${esc(c.verdict)}<br><span class="small muted">${c.avg != null ? c.avg + ' kg avg' : ''}${c.waist ? ', ' + c.waist + ' cm waist' : ''}${c.rhr ? ', HR ' + c.rhr : ''}</span>`, c.kcal + ' kcal')).join('')}</div>`;
  if (S.kcalHistory.length > 1) out += `<details class="block"><summary>Calorie changes</summary>${S.kcalHistory.slice().reverse().map(h => stat(`${fmtShort(h.date)}: ${esc(h.reason)}`, h.kcal + ' kcal')).join('')}</details>`;
  out += inbodyBlock(S);
  out += `<div class="block"><h3>12-minute run test</h3>${S.tests.length ? S.tests.map(x => stat(`Week ${x.week} (${fmtShort(x.date)})`, x.m + ' m')).join('') : '<p class="small muted">Weeks 1, 6 and 12, after Wednesday\'s session. Wear your Apple Watch for it.</p>'}
  <div class="row" style="margin-top:8px"><input class="t" id="testm" inputmode="numeric" placeholder="Distance in metres"><button class="btn" data-act="addtest">Save</button></div></div>`;
  out += liftsBlock(S) + photosBlock();
  return out;
}
export { addDays };
