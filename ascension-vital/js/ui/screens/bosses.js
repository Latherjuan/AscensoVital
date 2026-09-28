// Motor de jefes y quests (Modulo 5): quests por tareas con tiempo asignado, fecha objetivo,
// remate final al 80% del tiempo hecho. El catalogo de jefes viene de bossCatalog.js (Supabase
// con respaldo local), para poder agregar jefes nuevos sin tocar codigo.
import * as A from '../../game/actions.js';
import { PILLARS, PILLAR_IDS } from '../../game/content.js';
import { bossTemplates } from '../../game/bossCatalog.js';
import { bossState, questTaskStats, addDays } from '../../game/rules.js';
import { bar, pillarChip, screenHeader } from '../components.js';
import { esc, openModal, floatText, confirmModal, toast } from '../fx.js';
import { sfx } from '../audio.js';

export const background = 'battle';

let tab = 'active';

function spriteUrl(kind, state) {
  const tpl = bossTemplates()[kind];
  return tpl?.spriteBaseUrl ? `${tpl.spriteBaseUrl}/${state}.png` : `assets/bosses/${kind}_${state}.png`;
}

function taskRow(q, t) {
  return `
    <div class="task-row ${t.done ? 'done' : ''}">
      <label class="check">
        <input type="checkbox" data-action="task" data-id="${q.id}" data-task="${t.id}" ${t.done ? 'checked disabled' : ''}>
        <span class="grow">${esc(t.title)}</span>
        <span class="muted small">${t.minutes} min</span>
      </label>
      ${!t.done ? `<button class="btn icon small" data-action="removeTask" data-id="${q.id}" data-task="${t.id}" aria-label="Quitar tarea">✕</button>` : ''}
    </div>`;
}

function battleCard(q, todayKey) {
  const stats = questTaskStats(q, todayKey);
  const st = bossState(Math.round(100 * (1 - stats.ratio)), 100);
  const tpl = bossTemplates()[q.bossKind];
  const hpPct = 1 - stats.ratio;
  const expired = todayKey > q.targetDate;
  const daysMsg = stats.daysLeft >= 0
    ? `Quedan ${stats.daysLeft} día${stats.daysLeft === 1 ? '' : 's'}`
    : `Venció hace ${-stats.daysLeft} día${-stats.daysLeft === 1 ? '' : 's'}`;
  return `
    <article class="battle panel" data-quest="${q.id}">
      <div class="battle-head">
        <div>
          <div class="quest-title">${esc(q.title)}</div>
          <div class="muted">${daysMsg} · ${stats.doneMinutes}/${stats.totalMinutes} min</div>
          <div class="row gap wrap">${q.pillars.map(pillarChip).join('')}</div>
        </div>
        <button class="btn icon" data-action="remove" data-id="${q.id}" aria-label="Abandonar quest">✕</button>
      </div>
      <div class="arena">
        <img class="pixel boss-sprite state-${st} ${q.bossKind}" src="${spriteUrl(q.bossKind, st)}" alt="${esc(q.bossName)}">
      </div>
      <div class="boss-name">${esc(q.bossName)} <span class="muted">· ${tpl?.states[st] ?? ''}</span></div>
      ${bar(hpPct, { color: hpPct > 0.5 ? '#6fe36b' : hpPct > 0.25 ? '#f2c84b' : '#e0503a', label: `${Math.round(stats.ratio * 100)}% completado`, cls: 'hp' })}
      <div class="task-list">${q.tasks.map((t) => taskRow(q, t)).join('')}</div>
      <div class="task-add row gap wrap">
        <input class="task-title-input grow" placeholder="Nueva tarea" maxlength="60">
        <input class="task-min-input" type="number" min="1" max="600" placeholder="min">
        <button class="btn small" data-action="addTask" data-id="${q.id}">+ Agregar tarea</button>
      </div>
      <div class="row gap wrap center">
        ${stats.canFinish ? `<button class="btn gold pulse" data-action="finish" data-id="${q.id}">⚔ REMATE FINAL</button>` : ''}
        ${expired && stats.canFinish ? '<span class="muted">El plazo terminó, pero cumpliste el 80%: ¡remátalo!</span>' : ''}
      </div>
      <p class="muted small">Remate final disponible al completar el 80% del tiempo (${Math.ceil(stats.totalMinutes * 0.8)} min). Termina antes de la fecha objetivo y llevas un bono extra de XP.</p>
    </article>`;
}

export function render({ profile: p, today }) {
  const activeQ = p.quests.filter((q) => q.status === 'active');
  const doneQ = p.quests.filter((q) => q.status !== 'active');
  const shownTab = doneQ.length ? tab : 'active';
  const templates = bossTemplates();
  const firstKind = Object.keys(templates)[0];
  return `
    <div class="bosses">
      ${screenHeader('Jefes y Quests', 'Convierte una meta en un jefe: desglósala en tareas y ponle una fecha.')}
      <div class="row between wrap gap">
        <div class="tabs">
          <button class="tab ${shownTab === 'active' ? 'on' : ''}" data-action="tab" data-tab="active">Activos <span class="badge">${activeQ.length}</span></button>
          <button class="tab ${shownTab === 'defeated' ? 'on' : ''}" data-action="tab" data-tab="defeated">Jefes derrotados <span class="badge">${doneQ.length}</span></button>
        </div>
        <button class="btn primary" data-action="new">+ Nueva quest</button>
      </div>
      ${shownTab === 'active' ? (activeQ.length ? activeQ.map((q) => battleCard(q, today)).join('') : `
        <div class="panel empty-state">
          ${firstKind ? `<img class="pixel" src="${spriteUrl(firstKind, 0)}" alt="" width="120">` : ''}
          <p>No hay jefes activos. ¿Qué reto quieres desglosar en tareas y vencer?</p>
          <button class="btn primary" data-action="new">Invocar un jefe</button>
        </div>`) : `
        <section class="panel">
          <h2 class="title-sm">Crónica de batallas</h2>
          ${doneQ.length ? doneQ.map((q) => {
            const stats = questTaskStats(q, today);
            const st = bossState(Math.round(100 * (1 - stats.ratio)), 100);
            return `
            <div class="chronicle ${q.status}">
              <img class="pixel" src="${spriteUrl(q.bossKind, st)}" alt="" width="48">
              <div class="grow"><b>${esc(q.title)}</b><div class="muted small">${esc(q.bossName)} · ${q.status === 'completed' ? '🏆 Vencido' : '🌙 Se retiró'}</div></div>
              ${q.status === 'failed' ? `<button class="btn small" data-action="retry" data-id="${q.id}">Reintentar</button>` : ''}
              <button class="btn icon small" data-action="remove" data-id="${q.id}" aria-label="Quitar">✕</button>
            </div>`;
          }).join('') : '<p class="muted">Todavía no has derrotado ningún jefe.</p>'}
        </section>`}
    </div>`;
}

function pillarPicker(selected) {
  return PILLAR_IDS.map((pid) => `
    <label class="check pillar-check" style="--c:${PILLARS[pid].color}">
      <input type="checkbox" data-pillar="${pid}" ${selected.includes(pid) ? 'checked' : ''}> ${PILLARS[pid].name}
    </label>`).join('');
}

function renderTaskRows(container, tasks, onChange) {
  container.innerHTML = tasks.map((t, i) => `
    <div class="task-builder-row row gap wrap" data-i="${i}">
      <input class="tb-title grow" placeholder="Ej: Crear ejercicios de suma y resta" maxlength="60" value="${esc(t.title)}">
      <input class="tb-min" type="number" min="1" max="600" value="${t.minutes}">
      <span class="muted small">min</span>
      ${tasks.length > 1 ? '<button class="btn icon small" data-remove-row aria-label="Quitar tarea">✕</button>' : ''}
    </div>`).join('');
  container.querySelectorAll('.task-builder-row').forEach((row) => {
    const i = Number(row.dataset.i);
    row.querySelector('.tb-title').addEventListener('input', (e) => { tasks[i].title = e.target.value; });
    row.querySelector('.tb-min').addEventListener('input', (e) => { tasks[i].minutes = Math.max(1, Number(e.target.value) || 1); onChange(); });
    row.querySelector('[data-remove-row]')?.addEventListener('click', () => {
      tasks.splice(i, 1);
      renderTaskRows(container, tasks, onChange);
      onChange();
      sfx('blip');
    });
  });
}

function newQuestModal(ctx) {
  const templates = bossTemplates();
  let kind = Object.keys(templates)[0];
  const tasks = [{ title: '', minutes: 30 }];
  const defaultDate = addDays(ctx.today, 7);
  const m = openModal(`
    <h2 class="title-sm">Invocar un jefe</h2>
    <div class="boss-pick">
      ${Object.entries(templates).map(([k, t]) => `
        <button class="boss-option ${k === kind ? 'sel' : ''}" data-kind="${k}">
          <img class="pixel" src="${spriteUrl(k, 0)}" alt="">
          <span>${t.bossName}</span>
        </button>`).join('')}
    </div>
    <label class="field"><span>Tu reto</span><input class="q-title" placeholder="${esc(templates[kind]?.example ?? '')}" maxlength="50"></label>
    <label class="field"><span>Fecha objetivo</span><input class="q-date" type="date" min="${ctx.today}" value="${defaultDate}"></label>
    <div class="field">
      <span>Pilares que alimenta (elige uno o varios)</span>
      <div class="row gap wrap pillar-pick">${pillarPicker(templates[kind]?.pillars ?? [])}</div>
    </div>
    <div class="field">
      <span>Tareas (desglosa el reto; podrás agregar o quitar sobre la marcha)</span>
      <div class="task-builder"></div>
      <button class="btn small" data-add-task>+ Agregar tarea</button>
    </div>
    <p class="muted small q-summary"></p>
    <div class="row end gap"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>¡A la batalla!</button></div>`);
  const el = m.el;
  const builder = el.querySelector('.task-builder');
  const summary = () => {
    const totalMin = tasks.reduce((a, t) => a + (Number(t.minutes) || 0), 0);
    const date = el.querySelector('.q-date').value || '—';
    el.querySelector('.q-summary').textContent = `${tasks.length} tarea${tasks.length === 1 ? '' : 's'} · ${totalMin} min en total (~${totalMin} XP) · vence el ${date}.`;
  };
  renderTaskRows(builder, tasks, summary);
  summary();
  el.querySelector('.q-date').addEventListener('input', summary);
  el.querySelector('[data-add-task]').addEventListener('click', () => {
    tasks.push({ title: '', minutes: 30 });
    renderTaskRows(builder, tasks, summary);
    summary();
    sfx('blip');
  });
  el.querySelectorAll('.boss-option').forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.kind;
    el.querySelectorAll('.boss-option').forEach((x) => x.classList.toggle('sel', x === b));
    el.querySelector('.q-title').placeholder = templates[kind]?.example ?? '';
    el.querySelector('.pillar-pick').innerHTML = pillarPicker(templates[kind]?.pillars ?? []);
    sfx('blip');
  }));
  el.querySelector('[data-x]').addEventListener('click', m.close);
  el.querySelector('[data-ok]').addEventListener('click', () => {
    const pillars = Array.from(el.querySelectorAll('.pillar-pick input:checked')).map((cb) => cb.dataset.pillar);
    if (!pillars.length) { toast('Elige al menos un pilar.'); return; }
    const targetDate = el.querySelector('.q-date').value;
    if (!targetDate || targetDate < ctx.today) { toast('Elige una fecha objetivo a partir de hoy.'); return; }
    const cleanTasks = tasks
      .map((t) => ({ title: t.title.trim(), minutes: Math.max(1, Number(t.minutes) || 0) }))
      .filter((t) => t.title);
    if (!cleanTasks.length) { toast('Agrega al menos una tarea con nombre.'); return; }
    A.createQuest({ kind, title: el.querySelector('.q-title').value.trim(), pillars, targetDate, tasks: cleanTasks });
    sfx('hit');
    m.close();
    ctx.rerender();
  });
}

async function strike(el, ctx, fn) {
  const card = el.closest('.battle');
  const spriteEl = card?.querySelector('.boss-sprite');
  const rect = spriteEl?.getBoundingClientRect();
  const ev = fn();
  if (ev?.damage && spriteEl) {
    sfx('hit');
    spriteEl.classList.add('hurt');
    floatText(`-${ev.damage}%`, { color: '#ff5a4a', x: rect.left + rect.width / 2, y: rect.top + rect.height / 3, big: true });
    await new Promise((r) => setTimeout(r, 450));
  }
  ctx.rerender();
  await ctx.play(ev, null);
}

export const actions = {
  new: (_el, ctx) => newQuestModal(ctx),
  task: (el, ctx) => strike(el, ctx, () => A.completeQuestTask(el.dataset.id, el.dataset.task)),
  finish: (el, ctx) => strike(el, ctx, () => A.finishingBlow(el.dataset.id)),
  addTask: (el, ctx) => {
    const card = el.closest('.battle');
    const title = card.querySelector('.task-title-input').value.trim();
    const minutes = Math.max(1, Number(card.querySelector('.task-min-input').value) || 0);
    if (!title) { toast('Escribe el nombre de la tarea.'); return; }
    A.addQuestTask(el.dataset.id, { title, minutes });
    sfx('blip');
    ctx.rerender();
  },
  removeTask: async (el, ctx) => {
    if (await confirmModal('¿Quitar esta tarea pendiente?', { ok: 'Quitar' })) {
      A.removeQuestTask(el.dataset.id, el.dataset.task);
      ctx.rerender();
    }
  },
  tab: (el, ctx) => { tab = el.dataset.tab; ctx.rerender(); },
  retry: (el, ctx) => { A.retryQuest(el.dataset.id); tab = 'active'; ctx.rerender(); },
  remove: async (el, ctx) => {
    if (await confirmModal('¿Quitar esta quest? No perderás el XP ya ganado.', { ok: 'Quitar' })) {
      A.removeQuest(el.dataset.id);
      ctx.rerender();
    }
  },
};
