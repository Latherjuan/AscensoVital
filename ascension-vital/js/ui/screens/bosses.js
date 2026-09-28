// Motor de jefes y quests (Modulo 5): 100 HP por dia, dosis diarias, remate final con >= 80%.
import * as A from '../../game/actions.js';
import { BOSS_TEMPLATES, PILLARS, PILLAR_IDS } from '../../game/content.js';
import { bossState, questProgress, damagePerDose } from '../../game/rules.js';
import { bar, pillarChip, screenHeader } from '../components.js';
import { esc, openModal, floatText, confirmModal, toast } from '../fx.js';
import { sfx } from '../audio.js';

export const background = 'battle';

let tab = 'active';

const sprite = (q) => `assets/bosses/${q.bossKind}_${bossState(q.bossCurrentHp, q.bossTotalHp)}.png`;

function battleCard(q, today) {
  const prog = questProgress(q, today);
  const st = bossState(q.bossCurrentHp, q.bossTotalHp);
  const tpl = BOSS_TEMPLATES[q.bossKind];
  const hpPct = q.bossCurrentHp / q.bossTotalHp;
  const dosesLeftToday = q.dosesPerDay - prog.todayDoses;
  const expired = today > prog.endDate;
  return `
    <article class="battle panel" data-quest="${q.id}">
      <div class="battle-head">
        <div>
          <div class="quest-title">${esc(q.title)}</div>
          <div class="muted">Día ${prog.dayIndex + 1}/${q.days} · ${q.dosesPerDay} dosis/día · ${prog.done}/${prog.totalDoses} dosis</div>
          <div class="row gap wrap">${q.pillars.map(pillarChip).join('')}</div>
        </div>
        <button class="btn icon" data-action="remove" data-id="${q.id}" aria-label="Abandonar quest">✕</button>
      </div>
      <div class="arena">
        <img class="pixel boss-sprite state-${st} ${q.bossKind}" src="${sprite(q)}" alt="${esc(q.bossName)}">
      </div>
      <div class="boss-name">${esc(q.bossName)} <span class="muted">· ${tpl.states[st]}</span></div>
      ${bar(hpPct, { color: hpPct > 0.5 ? '#6fe36b' : hpPct > 0.25 ? '#f2c84b' : '#e0503a', label: `HP ${q.bossCurrentHp}/${q.bossTotalHp}`, cls: 'hp' })}
      <div class="dose-track">${Array.from({ length: q.dosesPerDay }, (_, k) => `<span class="dose ${k < prog.todayDoses ? 'on' : ''}"></span>`).join('')}<span class="muted small">dosis de hoy</span></div>
      <div class="row gap wrap center">
        ${prog.canFinish ? `<button class="btn gold pulse" data-action="finish" data-id="${q.id}">⚔ REMATE FINAL</button>` : ''}
        ${!expired && dosesLeftToday > 0 ? `<button class="btn primary" data-action="dose" data-id="${q.id}">Aplicar dosis (−${damagePerDose(q)} HP)</button>` : ''}
        ${!expired && dosesLeftToday <= 0 ? '<span class="ok">✓ Dosis de hoy completas. ¡Vuelve mañana!</span>' : ''}
        ${expired && prog.canFinish ? '<span class="muted">El plazo terminó, pero cumpliste el 80%: ¡remátalo!</span>' : ''}
      </div>
      <p class="muted small">Remate final disponible al completar el 80% de las dosis (${Math.ceil(prog.totalDoses * 0.8)}).</p>
    </article>`;
}

export function render({ profile: p, today }) {
  const activeQ = p.quests.filter((q) => q.status === 'active');
  const doneQ = p.quests.filter((q) => q.status !== 'active');
  const shownTab = doneQ.length ? tab : 'active';
  return `
    <div class="bosses">
      ${screenHeader('Jefes y Quests', 'Convierte una meta de varios días en un jefe. Cada día tiene 100 HP.')}
      <div class="row between wrap gap">
        <div class="tabs">
          <button class="tab ${shownTab === 'active' ? 'on' : ''}" data-action="tab" data-tab="active">Activos <span class="badge">${activeQ.length}</span></button>
          <button class="tab ${shownTab === 'defeated' ? 'on' : ''}" data-action="tab" data-tab="defeated">Jefes derrotados <span class="badge">${doneQ.length}</span></button>
        </div>
        <button class="btn primary" data-action="new">+ Nueva quest</button>
      </div>
      ${shownTab === 'active' ? (activeQ.length ? activeQ.map((q) => battleCard(q, today)).join('') : `
        <div class="panel empty-state">
          <img class="pixel" src="assets/bosses/titan_0.png" alt="" width="120">
          <p>No hay jefes activos. ¿Qué reto de varios días quieres vencer?</p>
          <button class="btn primary" data-action="new">Invocar un jefe</button>
        </div>`) : `
        <section class="panel">
          <h2 class="title-sm">Crónica de batallas</h2>
          ${doneQ.length ? doneQ.map((q) => `
            <div class="chronicle ${q.status}">
              <img class="pixel" src="${sprite(q)}" alt="" width="48">
              <div class="grow"><b>${esc(q.title)}</b><div class="muted small">${esc(q.bossName)} · ${q.status === 'completed' ? '🏆 Vencido' : '🌙 Se retiró'}</div></div>
              ${q.status === 'failed' ? `<button class="btn small" data-action="retry" data-id="${q.id}">Reintentar</button>` : ''}
              <button class="btn icon small" data-action="remove" data-id="${q.id}" aria-label="Quitar">✕</button>
            </div>`).join('') : '<p class="muted">Todavía no has derrotado ningún jefe.</p>'}
        </section>`}
    </div>`;
}

function pillarPicker(selected) {
  return PILLAR_IDS.map((pid) => `
    <label class="check pillar-check" style="--c:${PILLARS[pid].color}">
      <input type="checkbox" data-pillar="${pid}" ${selected.includes(pid) ? 'checked' : ''}> ${PILLARS[pid].name}
    </label>`).join('');
}

function newQuestModal(ctx) {
  let kind = 'titan';
  const selectedPillars = BOSS_TEMPLATES[kind].pillars;
  const m = openModal(`
    <h2 class="title-sm">Invocar un jefe</h2>
    <div class="boss-pick">
      ${Object.entries(BOSS_TEMPLATES).map(([k, t]) => `
        <button class="boss-option ${k === kind ? 'sel' : ''}" data-kind="${k}">
          <img class="pixel" src="assets/bosses/${k}_0.png" alt="">
          <span>${t.bossName}</span>
        </button>`).join('')}
    </div>
    <label class="field"><span>Tu reto</span><input class="q-title" placeholder="${esc(BOSS_TEMPLATES[kind].example)}" maxlength="50"></label>
    <div class="row gap">
      <label class="field grow"><span>Días (1-14)</span><input class="q-days" type="number" min="1" max="14" value="3"></label>
      <label class="field grow"><span>Dosis por día (1-5)</span><input class="q-doses" type="number" min="1" max="5" value="2"></label>
    </div>
    <div class="field">
      <span>Pilares que alimenta (elige uno o varios)</span>
      <div class="row gap wrap pillar-pick">${pillarPicker(selectedPillars)}</div>
    </div>
    <p class="muted small q-summary"></p>
    <div class="row end gap"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>¡A la batalla!</button></div>`);
  const el = m.el;
  const summary = () => {
    const d = Math.min(14, Math.max(1, Number(el.querySelector('.q-days').value) || 1));
    el.querySelector('.q-summary').textContent = `El jefe tendrá ${d * 100} HP. Recompensa: ${40 * d} XP + cofre.`;
  };
  const bindPillarChecks = () => {
    el.querySelectorAll('.pillar-pick input').forEach((cb) => cb.addEventListener('change', () => {
      sfx('blip');
    }));
  };
  summary();
  bindPillarChecks();
  el.querySelector('.q-days').addEventListener('input', summary);
  el.querySelectorAll('.boss-option').forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.kind;
    el.querySelectorAll('.boss-option').forEach((x) => x.classList.toggle('sel', x === b));
    el.querySelector('.q-title').placeholder = BOSS_TEMPLATES[kind].example;
    el.querySelector('.pillar-pick').innerHTML = pillarPicker(BOSS_TEMPLATES[kind].pillars);
    bindPillarChecks();
    sfx('blip');
  }));
  el.querySelector('[data-x]').addEventListener('click', m.close);
  el.querySelector('[data-ok]').addEventListener('click', () => {
    const pillars = Array.from(el.querySelectorAll('.pillar-pick input:checked')).map((cb) => cb.dataset.pillar);
    if (!pillars.length) { toast('Elige al menos un pilar.'); return; }
    const days = Math.min(14, Math.max(1, Number(el.querySelector('.q-days').value) || 1));
    const dosesPerDay = Math.min(5, Math.max(1, Number(el.querySelector('.q-doses').value) || 1));
    A.createQuest({ kind, title: el.querySelector('.q-title').value.trim(), days, dosesPerDay, pillars });
    sfx('hit');
    m.close();
    ctx.rerender();
  });
}

async function strike(el, ctx, fn) {
  const card = el.closest('.battle');
  const spriteEl = card.querySelector('.boss-sprite');
  const rect = spriteEl.getBoundingClientRect();
  const ev = fn(el.dataset.id);
  if (!ev?.damage) return;
  sfx('hit');
  spriteEl.classList.add('hurt');
  floatText(`-${ev.damage}`, { color: '#ff5a4a', x: rect.left + rect.width / 2, y: rect.top + rect.height / 3, big: true });
  await new Promise((r) => setTimeout(r, 450));
  ctx.rerender();
  await ctx.play(ev, null);
}

export const actions = {
  new: (_el, ctx) => newQuestModal(ctx),
  dose: (el, ctx) => strike(el, ctx, A.applyDose),
  finish: (el, ctx) => strike(el, ctx, A.finishingBlow),
  tab: (el, ctx) => { tab = el.dataset.tab; ctx.rerender(); },
  retry: (el, ctx) => { A.retryQuest(el.dataset.id); tab = 'active'; ctx.rerender(); },
  remove: async (el, ctx) => {
    if (await confirmModal('¿Quitar esta quest? No perderás el XP ya ganado.', { ok: 'Quitar' })) {
      A.removeQuest(el.dataset.id);
      ctx.rerender();
    }
  },
};
