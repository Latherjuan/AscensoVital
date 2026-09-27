// Santuario Central (Modulo 1): pedestal con avatar, nivel general por cuello de botella y hexagono.
import { PILLARS, PILLAR_IDS, MAX_SHIELDS } from '../../game/content.js';
import { overall, walkBoss } from '../../game/rules.js';
import { avatarImg, hexagon, pillarRow } from '../components.js';
import { esc } from '../fx.js';

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
    </div>`;
}

export const actions = {};
