// "Copy my status": a compact summary to paste into Claude, plus importing recipes Claude sends back.
import { addDays, num, r1, DOWL, fmtShort } from './util.js';
import { SESSIONS, EX, EQUIP, planWeek, blockOf, weekInBlock, phaseFor, dayKind, exName, setsFor, defaultAlt, allRecs, history } from './training.js';
import { stats } from './adapt.js';
import { cycleFor, dayPlan, flexFactor, recipe, itemLabel, foodsList, priceOf, MEAL_LABEL } from './mealplan.js';
import { FOODS } from './foods.js';
import { dow } from './util.js';

export const QUESTIONS = [
  ['ontrack', 'Am I on track?', 'Look at my numbers and tell me honestly if I\'m on track, and the one thing I should change this week.'],
  ['busy', 'Machine is busy', 'The machine for my next exercise is busy. What should I do instead, or what should I do first while I wait?'],
  ['eatout', 'Eating out', 'I\'m eating out. Tell me what to order to stay on plan (I\'ll tell you the place or send a menu photo).'],
  ['sore', 'Tired or sore', 'I feel tired or sore today. Should I train as planned, train lighter, or rest?'],
  ['missed', 'Missed a session', 'I missed a session. How do I fit it in this week without wrecking recovery before Thursday football?'],
  ['recipes', 'New recipes for my plan', null],
  ['custom', 'My own question', '']
];

export function statusText(S, today, question) {
  const P = S.profile, w = planWeek(S, today), st = stats(S, today);
  const ib = S.inbody.map(i => `${i.date}: ${i.weight} kg, ${i.pbf}% fat, muscle ${i.smm} kg, fat ${i.bfm} kg, visceral ${i.visceral}${i.segMuscle ? `, arm muscle ${i.segMuscle.armL}/${i.segMuscle.armR}%, trunk ${i.segMuscle.trunk}%, legs ${i.segMuscle.legL}/${i.segMuscle.legR}%` : ''}`).join('\n');
  const last7 = [...Array(7)].map((_, i) => addDays(today, -i)).filter(k => S.daily[k]).map(k => { const d = S.daily[k]; return `${k}: weight ${d.weight || '-'}, steps ${d.steps || '-'}, sleep ${d.sleep || '-'}h, food on plan ${d.food || '-'}${d.acts?.length ? ', ' + d.acts.map(a => a.t + ' ' + a.min + ' min').join(', ') : ''}${d.offplan?.length ? ', ate out: ' + d.offplan.map(o => o.n + ' ~' + o.kcal + ' kcal').join(', ') : ''}`; }).join('\n');
  const recent = [];
  for (const { date, sid, rec } of [...allRecs(S)].sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 4)) {
    const ex = Object.entries(rec.ex).map(([id, x]) => { const s = x.sets.filter(s => s.done); return s.length ? `${exName(id, x.alt)} ${s.map(s => `${s.w || 'BW'}x${s.r}`).join(',')}` : null; }).filter(Boolean).join('; ');
    if (ex) recent.push(`${date} ${SESSIONS[sid].n}: ${ex}`);
  }
  let todayTxt;
  const kind = dayKind(today);
  if (w < 1) todayTxt = `Plan starts ${P.startDate}.`;
  else if (SESSIONS[kind]) todayTxt = `${DOWL[dow(today)]}: ${SESSIONS[kind].n} — ` + SESSIONS[kind].ex.map(id => `${exName(id, defaultAlt(S, id))} ${setsFor(id, w)}x${EX[id].reps}`).join(', ');
  else todayTxt = kind === 'THU' ? 'Thursday: no lifting, football tonight.' : 'Rest day (weekend in Makkah).';
  const c = cycleFor(S, today);
  let food = 'No meal plan generated yet.';
  if (c) {
    const f = flexFactor(S, c), dp = dayPlan(S, c, today, f);
    food = dp ? `Today's meals: ` + dp.meals.map(m => `${MEAL_LABEL[m.meal]}: ${m.r.n} (${Math.round(m.tot.kcal)} kcal, ${Math.round(m.tot.p)} g protein)`).join('; ') : 'Today is an away day (no home meals).';
  }
  const missing = EQUIP.filter(e => S.equipment[e[0]] === false).map(e => e[1]);
  const ci = S.checkins.slice(-4).map(x => `${x.date}: ${x.verdict}${x.waist ? `, waist ${x.waist} cm` : ''}${x.avg ? `, avg ${x.avg} kg` : ''}`).join('\n');
  return `You're my personal trainer and nutrition coach. Be direct and evidence-based, short answers for a phone. My app tracks everything; here's my current status.

ME: Male, ${P.age}, ${P.heightCm} cm, Egyptian, lives alone in Jeddah, desk job Sun–Thu 9–5. Gym at 6am Sun–Wed (Fitness Time, Technogym, has pool, track, sauna, cold jacuzzi). Thursday night football in Makkah, weekends in Makkah. Goal: lose fat (stomach, love handles, chest) and build upper-body muscle; better stamina and speed for football. Mild rounded shoulders and forward head with a small bump at the base of the neck (not checked by a doctor). Goal weight ${P.goalWeight} kg.
INBODY:
${ib}
PLAN: Week ${w < 1 ? 0 : weekInBlock(w)} of 12 (block ${w < 1 ? 1 : blockOf(w)}), phase "${w < 1 ? 'not started' : phaseFor(w).n}". Upper/lower split: Sun Lower A, Mon Upper A, Tue Lower B, Wed Upper B + conditioning.${missing.length ? ` Gym doesn't have: ${missing.join(', ')}.` : ''}
TODAY ${today}: ${todayTxt}
LAST 7 DAYS:
${last7 || 'no logs'}
WEEKLY NUMBERS: 7-day avg weight ${st.w0 != null ? r1(st.w0) + ' kg' : '-'} (previous week ${st.w1 != null ? r1(st.w1) + ' kg' : '-'}), sessions ${st.sessions}/${st.planned}, steps ${st.steps != null ? Math.round(st.steps) : '-'}, sleep ${st.sleep != null ? r1(st.sleep) + ' h' : '-'}.
CHECK-INS:
${ci || 'none yet'}
RECENT SESSIONS:
${recent.join('\n') || 'none yet'}
NUTRITION: ${P.kcal} kcal, at least ${P.protein} g protein. Food budget ${P.budget} SAR/month. Shops every 2 weeks, cooks Sunday and Tuesday evenings (stove, oven, microwave, hand blender; no air fryer, no rice cooker; small freezer). Medium spice max. Creatine 5 g daily.
${food}

MY QUESTION: ${question}`;
}

// Prompt asking Claude for new recipes in a format the app can import.
export function recipePrompt(S, ask) {
  const foods = foodsList(S).filter(f => !f.optional).map(f => `${f.id} (${f.n}, per ${f.b === 1 ? '1 ' + f.u : f.b + ' ' + f.u}: ${f.m[0]} kcal ${f.m[1]} g protein; ${priceOf(S, f.id)} SAR per ${f.pl})`).join('\n');
  const have = S.customRecipes.length ? `\nRecipes I already have: ${S.customRecipes.map(r => r.n).join(', ')}.` : '';
  return `I use a meal-prep app. Give me ${ask || '4 new cheap, high-protein recipes for meal prep (2 lunch/dinner batch dishes, 1 breakfast, 1 no-cook dinner)'}. Male, 187 cm, ~86 kg, cutting fat while building muscle; ${S.profile.kcal} kcal and ${S.profile.protein} g protein a day. Budget is tight. Egyptian/Saudi flavours welcome, medium spice max. Kitchen: stove, oven, microwave, hand blender. Batch dishes must keep 3 days in the fridge.${have}

Use ONLY these ingredient ids (quantities are per ONE portion; g or ml, or count for eggs/cans/loaves):
${foods}
If you really need an ingredient that's not listed, add it under "foods" with macros.

Reply with your short explanation, then ONE code block of JSON exactly in this shape:
{"recipes":[{"n":"Recipe name","kind":"batch|fresh|nocook","slots":["lunch","dinner"],"base":"chicken","time":40,"tool":"Stove","keeps":3,"items":[["chicken",180],["rice",70,1],["oil",6,1]],"steps":["Step 1","Step 2"]}],"foods":[{"id":"new_id","n":"Name","pack":500,"u":"g","price":10,"pl":"500 g","b":100,"m":[100,10,10,1],"where":"pantry"}]}
Rules: slots from breakfast/lunch/snack/dinner. Put 1 as the third value for carb/fat items that can be scaled to my calories (rice, pasta, bread, oats, oil, potato). Aim for 500–650 kcal and 35+ g protein per main portion.`;
}

// Parse what Claude sent back. Returns {recipes, foods, errors}.
export function parseImport(S, text) {
  const errors = [];
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1];
  else { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); if (a >= 0 && b > a) raw = raw.slice(a, b + 1); }
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { recipes: [], foods: {}, errors: ['Couldn\'t read the reply. Copy Claude\'s whole answer, including the code block.'] }; }
  const foods = {};
  for (const f of (Array.isArray(data.foods) ? data.foods : [])) {
    if (!f || typeof f.id !== 'string' || !Array.isArray(f.m) || f.m.length !== 4 || !f.m.every(x => typeof x === 'number')) { errors.push(`Skipped an ingredient with missing data${f?.n ? ': ' + f.n : ''}.`); continue; }
    const id = f.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (FOODS.some(x => x.id === id)) continue;
    foods[id] = { id, n: String(f.n || id), pack: +f.pack > 0 ? +f.pack : 1, u: ['g', 'ml', 'can', 'egg', 'loaf', 'piece'].includes(f.u) ? f.u : 'g', price: +f.price >= 0 ? +f.price : 0, pl: String(f.pl || ''), b: +f.b > 0 ? +f.b : 100, m: f.m, where: ['freezer', 'fridge', 'fresh', 'pantry'].includes(f.where) ? f.where : 'pantry', custom: true };
  }
  const known = id => FOODS.some(f => f.id === id) || foods[id] || S.customFoods?.[id];
  const recipes = [];
  for (const r of (Array.isArray(data.recipes) ? data.recipes : [])) {
    const name = String(r?.n || '').trim();
    if (!name || !Array.isArray(r.items) || !r.items.length) { errors.push('Skipped a recipe without a name or ingredients.'); continue; }
    const items = r.items.filter(x => Array.isArray(x) && known(x[0]) && typeof x[1] === 'number' && x[1] > 0).map(x => x[2] ? [x[0], x[1], 1] : [x[0], x[1]]);
    if (items.length < r.items.length) errors.push(`${name}: ignored ${r.items.length - items.length} unknown ingredient(s).`);
    if (!items.length) continue;
    const slots = (Array.isArray(r.slots) ? r.slots : []).filter(s => ['breakfast', 'lunch', 'snack', 'dinner'].includes(s));
    const kind = ['batch', 'fresh', 'nocook'].includes(r.kind) ? r.kind : 'batch';
    recipes.push({ id: 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) + '_' + Date.now().toString(36).slice(-4) + recipes.length, n: name, kind, slots: slots.length ? slots : ['lunch', 'dinner'], base: String(r.base || 'other'), time: +r.time || 30, tool: String(r.tool || ''), keeps: Math.min(4, +r.keeps || 3), items, steps: (Array.isArray(r.steps) ? r.steps : []).map(String).slice(0, 12), custom: true, added: fmtShort(new Date().toISOString().slice(0, 10)) });
  }
  if (!recipes.length && !errors.length) errors.push('No recipes found in that reply.');
  return { recipes, foods, errors };
}

// InBody from a photo: Claude reads the report (Arabic or English) and answers in a format the app can load.
export const INBODY_PROMPT = `I'm attaching a photo of my InBody result sheet (it may be in Arabic). Read it carefully and reply with ONE code block of JSON, exactly in this shape, numbers only, null for anything you can't see:
{"date":"YYYY-MM-DD","weight":86.6,"pbf":24.5,"smm":37.1,"bfm":21.2,"visceral":8,"whr":0.90,"score":70,"segMuscle":{"armL":90.3,"armR":91.5,"trunk":92.2,"legL":105.6,"legR":106.2},"segFat":{"armL":189.8,"armR":185.9,"trunk":226.0,"legL":162.0,"legR":162.8}}
Field meanings: weight = body weight kg; pbf = percent body fat; smm = skeletal muscle mass kg; bfm = body fat mass kg; visceral = visceral fat level; whr = waist-hip ratio; score = InBody score out of 100; segMuscle = segmental lean (muscle) analysis, the % value for each limb and the trunk; segFat = segmental fat analysis, the % value for each. Use the report's own left/right labels (يسار = left, يمين = right). Use the test date printed on the sheet.`;

const RANGES = { weight: [30, 250], pbf: [3, 70], smm: [10, 80], bfm: [1, 150], visceral: [1, 30], whr: [0.5, 1.5], score: [0, 100] };
export function parseInbody(text) {
  let raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1]; else { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); if (a >= 0 && b > a) raw = raw.slice(a, b + 1); }
  let d; try { d = JSON.parse(raw); } catch (e) { return { data: null, errors: ['Couldn\'t read that. Copy Claude\'s whole answer, including the code block.'] }; }
  const out = {}, errors = [];
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const v = typeof d[k] === 'number' ? d[k] : num(d[k]);
    if (v == null) continue;
    if (v < lo || v > hi) { errors.push(`${k} = ${v} looks wrong, left it empty.`); continue; }
    out[k] = v;
  }
  for (const g of ['segMuscle', 'segFat']) {
    const src = d[g] || {}, o = {};
    for (const k of ['armL', 'armR', 'trunk', 'legL', 'legR']) { const v = typeof src[k] === 'number' ? src[k] : num(src[k]); if (v != null && v >= 20 && v <= 700) o[k] = v; }
    if (Object.keys(o).length) out[g] = o;
  }
  if (typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && !isNaN(new Date(d.date))) out.date = d.date;
  if (out.weight == null || out.pbf == null) errors.unshift('Weight or body fat % is missing. Check the photo is sharp and try again, or type them in.');
  return { data: out, errors };
}
