// Santuario Central (Modulo 1): pedestal con avatar, nivel general por cuello de botella y hexagono.
import * as A from '../../game/actions.js';
import { PILLARS, PILLAR_IDS, MAX_SHIELDS } from '../../game/content.js';
import { overall, walkBoss } from '../../game/rules.js';
import { avatarImg, hexagon, pillarRow } from '../components.js';
import { esc, toast, confirmModal } from '../fx.js';

export const background = 'sanctuary';

export function render({ profile: p, today }) {
  const o = overall(p);
  const log = p.log[today] ?? { missions: [], walkMinutes: 0 };
  const habitsDone = p.habits.filter((h) => h.doneDates.includes(today)).length;
  const boss = walkBoss(p);
  const weakNames = o.weakest.map((w) => PILLARS[w].name).join(', ');
  return `
    <div class="sanctuary">
      <section class="altar">
        <div class="hero-name">${esc(p.name)}</div>
        <div class="pedestal">${avatarImg(p, { cls: 'big idle' })}</div>
        <div class="status-strip">
          <span title="Racha de días">🔥 ${p.streak} <small>días</small></span>
          <span title="Escudos de racha"><img class="pixel mini" src="assets/ui/shield_recharge.png" alt=""> ${p.streakShields}/${MAX_SHIELDS}</span>
          ${p.humilityCharges ? `<span class="humble" title="Multiplicador de Humildad activo"><img class="pixel mini" src="assets/ui/lotus.png" alt=""> ×1.25 (${p.humilityCharges})</span>` : ''}
        </div>
      </section>

      <section class="panel level-panel" data-tut="hexagon">
        <div class="overall">
          <div class="overall-num">${o.overallLevel}</div>
          <div>
            <div class="title-sm">Nivel General</div>
            <div class="formula">min(pilares) <b>${o.min}</b> + Armonía <b>${o.harmonyBonus}</b></div>
          </div>
        </div>
        ${hexagon(p, o.min === o.max ? [] : o.weakest)}
        ${o.min === o.max
          ? '<p class="bottleneck ok">✦ Tus 6 pilares están en armonía.<br><span class="muted">Súbelos juntos para ascender.</span></p>'
          : `<p class="bottleneck">⚠ Cuello de botella: <b>${esc(weakNames)}</b>.<br><span class="muted">Atiende tu pilar más débil para subir de nivel general.</span></p>`}
      </section>

      <section class="panel today-panel">
        <h2 class="title-sm">Hoy</h2>
        <a class="today-item" href="#/misiones"><img class="pixel mini" src="assets/ui/chest_closed.png" alt=""> Misiones <b>${habitsDone}/${p.habits.length}</b></a>
        <a class="today-item" href="#/caminata"><img class="pixel mini" src="assets/equipment/boots_t2.png" alt=""> Caminata <b>${log.walkMinutes ?? 0}/${boss.minutes} min</b>${p.walk.pendingMinutes ? ` <span class="badge">+${p.walk.pendingMinutes} pendientes</span>` : ''}</a>
        <a class="today-item" href="#/jefes"><img class="pixel mini" src="assets/bosses/dragon_0.png" alt=""> Jefes activos <b>${p.quests.filter((q) => q.status === 'active').length}</b></a>
        <a class="today-item" href="#/espiritu"><img class="pixel mini" src="assets/ui/lotus.png" alt=""> Píldoras espirituales <b>${(log.spiritPills ?? []).length}</b></a>
      </section>

      <section class="panel pillars-panel">
        <h2 class="title-sm">Los 6 Pilares</h2>
        ${PILLAR_IDS.map((pid) => pillarRow(p, pid, { weak: o.min !== o.max && o.weakest.includes(pid) })).join('')}
      </section>

      <section class="panel backup-panel">
        <h2 class="title-sm">Copia de seguridad</h2>
        <p class="muted small">Descarga un archivo con todo tu progreso, o restáuralo si lo necesitas recuperar.</p>
        <div class="row gap wrap">
          <button class="btn" data-action="exportBackup">⬇ Exportar copia</button>
          <button class="btn" data-action="importBackup">⬆ Restaurar copia</button>
        </div>
        <input type="file" accept="application/json" class="backup-file-input" hidden>
      </section>
    </div>`;
}

export function mount(root, ctx) {
  root.querySelector('.backup-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.profiles || typeof data.profiles !== 'object') throw new Error('formato inválido');
    } catch {
      toast('Ese archivo no es una copia de seguridad válida.');
      return;
    }
    const count = Object.keys(data.profiles).length;
    const ok = await confirmModal(`Vas a restaurar una copia con ${count} partida${count === 1 ? '' : 's'}. Reemplazará todo tu progreso actual en este dispositivo. ¿Continuar?`, { ok: 'Restaurar', danger: true });
    if (!ok) return;
    A.importBackup(data);
    toast('Copia de seguridad restaurada.');
    ctx.rerender();
  });
}

export const actions = {
  exportBackup: () => {
    const data = A.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ascension-vital-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Copia de seguridad descargada.');
  },
  importBackup: () => { document.querySelector('.backup-file-input')?.click(); },
};
