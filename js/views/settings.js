import { app } from '../store.js';
import { check } from '../ui.js';
import { esc, DOWL, DOW, fmtShort } from '../util.js';
import { EQUIP } from '../training.js';

export const ICS_OPTS = [['gym', 'Gym sessions, 6am (Sun–Wed)'], ['sleep', 'Bedtime the night before gym'], ['weigh', 'Morning weigh-in + creatine'], ['cook', 'Cook nights'], ['shop', 'Shopping every 2 weeks'], ['checkin', 'Weekly check-in (Saturday)'], ['posture', 'Posture routine (weekdays 3pm)']];
export const icsSel = { gym: true, sleep: true, weigh: true, cook: true, shop: true, checkin: true, posture: false };

const dayPick = (field, sel) => `<div class="daypick">${DOW.map((d, i) => `<button data-act="daytoggle" data-f="${field}" data-v="${i}" class="${sel.includes(i) ? 'on' : ''}">${d}</button>`).join('')}</div>`;

export function vSettings() {
  const S = app.S, P = S.profile;
  return `<button class="btn sm ghost" data-act="go" data-tab="today">← Back</button>
  <h2>You</h2><div class="block"><div class="grid2">
  <div><label class="f" for="sk">Calories</label><input class="t" id="sk" inputmode="numeric" data-prof="kcal" value="${P.kcal}"></div>
  <div><label class="f" for="sp">Protein (g)</label><input class="t" id="sp" inputmode="numeric" data-prof="protein" value="${P.protein}"></div>
  <div><label class="f" for="sg">Goal weight (kg)</label><input class="t" id="sg" inputmode="decimal" data-prof="goalWeight" value="${P.goalWeight}"></div>
  <div><label class="f" for="sa">Age</label><input class="t" id="sa" inputmode="numeric" data-prof="age" value="${P.age}"></div></div>
  <label class="f" for="sd">Plan start (a Sunday)</label><input class="t" id="sd" type="date" data-prof="startDate" value="${esc(P.startDate)}">
  <label class="f" for="sx">Foods to avoid</label><input class="t" id="sx" data-prof="dislikes" value="${esc(P.dislikes)}">
  <p class="small muted" style="margin:8px 0 0">Calories normally change through the weekly check-in, with the reason saved.</p></div>

  <h2>Week and kitchen</h2><div class="block">
  <label class="f">Days you eat at home</label>${dayPick('homeDays', P.homeDays)}
  <label class="f">Cook nights</label>${dayPick('cookDays', P.cookDays)}
  <label class="f" for="shopd">Shopping day (every 2 weeks)</label><select class="t" id="shopd" data-prof="shopDay">${DOWL.map((d, i) => `<option value="${i}" ${P.shopDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select>
  <label class="f">Each cook night</label><div class="seg"><button data-act="cookmode" data-v="one" class="${P.cookMode !== 'two' ? 'on' : ''}">1 dish + no-cook dinners</button><button data-act="cookmode" data-v="two" class="${P.cookMode === 'two' ? 'on' : ''}">2 dishes</button></div>
  <div style="margin-top:8px">${check('bigmeal', P.bigMeal !== false, 'One big cook night a month (oven + stove, 60–90 min, feeds 3 days). Other cook nights stay quick and easy.')}${check('awaytoggle', (P.awayMeals || []).includes('4:dinner'), 'Thursday dinner is away (football in Makkah)')}</div>
  <p class="small muted" style="margin:8px 0 0">Changes apply to the next plan you make. To redo the current one: Food > 2 weeks > New recipes.</p></div>

  <h2>Reminders</h2><div class="block"><p class="small">Adds repeating events with alerts to your iPhone Calendar. Tap the button, then <strong>Add All</strong>.</p>
  ${ICS_OPTS.map(([k, l]) => check('icstoggle', icsSel[k], esc(l), `data-k="${k}"`)).join('')}
  <button class="btn primary block-w" style="margin-top:10px" data-act="ics">Add to my calendar</button>
  <p class="small muted" style="margin:8px 0 0">If nothing opens from the home-screen app, open the app link in Safari and tap it there. To change them later, delete the events in Calendar and add again.</p></div>

  <h2>Your gym</h2><div class="block"><p class="small muted">Untick anything Fitness Time Palestine Street doesn't have. Swaps only use what's ticked.</p>${EQUIP.map(([id, l]) => check('equip', S.equipment[id] !== false, esc(l), `data-id="${id}"`)).join('')}</div>

  <h2>Data</h2><div class="block"><p class="small">Everything is saved on this phone only. Back up every couple of weeks (save the file to iCloud Drive or send it to yourself).${S.lastBackup ? ` Last backup: ${fmtShort(S.lastBackup)}.` : ' No backup yet.'}</p>
  <button class="btn primary block-w" data-act="backup">Save a backup</button>
  <label class="btn block-w" style="margin-top:8px" for="restore">Restore from a backup</label><input type="file" id="restore" accept="application/json,.json" hidden data-restore="1">
  <button class="btn block-w ghost" style="margin-top:8px" data-act="reset">Erase all logs and start over</button></div>
  <p class="small muted" style="text-align:center">Farouk's Coach · v1</p>`;
}
