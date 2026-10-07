import { app } from '../store.js';
import { ui } from '../ui.js';
import { esc } from '../util.js';
import { QUESTIONS } from '../status.js';

export const CLAUDE_URL = 'https://claude.ai/new';

export function vCoach() {
  let out = `<h2 style="margin-top:4px">Coach</h2>
  <div class="block"><h3>How it works</h3><ol class="steps"><li>Tap a question below. The app copies your full status (plan, this week's numbers, lifts, food, budget) plus the question.</li><li>Tap <strong>Open Claude</strong> and paste it into a new chat (press and hold, Paste).</li><li>Ask follow-ups there. Next time, copy a fresh status so Claude sees your latest numbers.</li></ol></div>`;
  if (ui.copied) out += `<div class="block alert" id="copied"><p style="margin:0"><strong>${ui.copied.ok ? 'Copied.' : 'Copy didn\'t work on this phone.'}</strong> ${ui.copied.ok ? 'Now open Claude and paste.' : 'Press and hold the text below, Select All, Copy.'}</p>
    ${ui.copied.ok ? '' : `<textarea class="t" readonly style="margin-top:8px;min-height:160px">${esc(ui.copied.text)}</textarea>`}
    <div class="row wrapflex" style="margin-top:10px"><a class="btn primary" href="${CLAUDE_URL}" target="_blank" rel="noopener">Open Claude</a><button class="btn ghost" data-act="copyclose">Done</button></div></div>`;
  out += `<h2>Ask Claude about…</h2><div class="block">${QUESTIONS.filter(q => q[2] && q[0] !== 'custom').map(([k, l]) => `<button class="mealrow qrow" data-act="copystatus" data-q="${k}"><span><strong>${esc(l)}</strong></span><span class="iconsm">⧉</span></button>`).join('')}
  <label class="f" for="askq">Or your own question</label><textarea class="t" id="askq" data-ui="ask" placeholder="e.g. My lower back feels tight after RDLs, what should I change?">${esc(ui.ask)}</textarea>
  <button class="btn primary block-w" style="margin-top:8px" data-act="copystatus" data-q="custom">Copy status + my question</button></div>
  <h2>New recipes from Claude</h2><div class="block"><p class="small">Bored of the rotation? Ask Claude for recipes. It answers in a format the app can load, and the planner starts using them.</p>
  <label class="f" for="reca">What do you want? (optional)</label><input class="t" id="reca" data-ui="recipeAsk" value="${esc(ui.recipeAsk)}" placeholder="e.g. 3 chicken dishes with an Egyptian taste">
  <button class="btn block-w" style="margin-top:8px" data-act="copyrecipes">Copy the recipe request</button>
  <label class="f" for="paste">Then paste Claude's whole answer here</label><textarea class="t" id="paste" placeholder="Paste the reply, including the code block"></textarea>
  <button class="btn primary block-w" style="margin-top:8px" data-act="importrecipes">Load the recipes</button>
  ${ui.importMsg ? `<div class="note">${ui.importMsg}</div>` : ''}</div>
  <div class="block flat"><p class="small" style="margin:0"><strong>Stop and see a doctor</strong> if you get chest pain or pressure, dizziness or fainting, or a racing heartbeat at rest. For the neck: if the bump grows, hurts, or you get numbness, tingling or headaches.</p></div>`;
  return out;
}
export { app };
