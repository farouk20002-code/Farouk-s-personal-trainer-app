// Calendar reminders (.ics). iPhone opens the file and offers "Add All" to the Calendar app.
import { addDays, dow, pad } from './util.js';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const stamp = (k, hh, mm) => k.replace(/-/g, '') + 'T' + pad(hh) + pad(mm) + '00';
const firstOn = (from, d) => { let k = from; for (let i = 0; i < 7; i++) { if (dow(k) === d) return k; k = addDays(k, 1); } return from; };

function ev(uid, start, hh, mm, durMin, title, desc, rrule, alarmMin) {
  const endM = hh * 60 + mm + durMin;
  return ['BEGIN:VEVENT', `UID:${uid}@farouks-coach`, `DTSTAMP:${stamp(start, 0, 0)}Z`.replace('T000000Z', 'T000000Z'),
    `DTSTART;TZID=Asia/Riyadh:${stamp(start, hh, mm)}`, `DTEND;TZID=Asia/Riyadh:${stamp(start, Math.floor(endM / 60), endM % 60)}`,
    `SUMMARY:${title}`, `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`, rrule ? `RRULE:${rrule}` : null,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, `TRIGGER:-PT${alarmMin}M`, 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n');
}

// opts: which groups to include.
export function buildICS(S, from, opts) {
  const P = S.profile, out = [];
  const names = { 0: 'Lower A', 1: 'Upper A', 2: 'Lower B', 3: 'Upper B + conditioning' };
  const start = P.startDate > from ? P.startDate : from;
  if (opts.gym) for (const d of [0, 1, 2, 3]) out.push(ev(`gym${d}`, firstOn(start, d), 6, 0, 75, `Gym: ${names[d]}`, 'Open Farouk\'s Coach and tap Start.', `FREQ=WEEKLY;BYDAY=${BYDAY[d]}`, 30));
  if (opts.sleep) for (const d of [6, 0, 1, 2]) out.push(ev(`sleep${d}`, firstOn(start, d), 22, 15, 15, 'Bed by 10:30 (gym at 6am)', 'Phone down. 7 hours of sleep is part of the plan.', `FREQ=WEEKLY;BYDAY=${BYDAY[d]}`, 0));
  if (opts.weigh) out.push(ev('weigh', start, 7, 30, 5, 'Weigh in + creatine', 'After the toilet, before food. Log it in the app. 5 g creatine.', 'FREQ=DAILY', 0));
  if (opts.cook) for (const d of P.cookDays) out.push(ev(`cook${d}`, firstOn(start, d), 18, 30, 75, 'Cook session', 'Open Food > Cook in the app for tonight\'s recipe and quantities.', `FREQ=WEEKLY;BYDAY=${BYDAY[d]}`, 30));
  if (opts.shop) out.push(ev('shop', firstOn(from, P.shopDay), 17, 0, 90, 'Shopping (2 weeks)', 'Open Food > Shop. Generate the next 2 weeks first if it asks.', 'FREQ=WEEKLY;INTERVAL=2', 60));
  if (opts.checkin) out.push(ev('checkin', firstOn(start, 6), 10, 0, 10, 'Weekly check-in', 'Measure your waist at the belly button, then run the check-in in Progress.', `FREQ=WEEKLY;BYDAY=SA`, 0));
  if (opts.posture) out.push(ev('posture', firstOn(start, 0), 15, 0, 5, 'Posture: 3 minutes', 'Chin tucks, doorway stretch, upper-back extension, wall angels. Tick it in the app.', 'FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH', 0));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Farouks Coach//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Farouk\'s Coach',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Riyadh', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0300', 'TZNAME:AST', 'END:STANDARD', 'END:VTIMEZONE',
    ...out, 'END:VCALENDAR'].join('\r\n');
}
