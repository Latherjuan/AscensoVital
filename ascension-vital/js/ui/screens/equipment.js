// Equipamiento Capa B (Modulo 6): una pieza por pilar, 4 tiers segun el nivel del pilar.
import { PILLARS, EQUIPMENT, TIER_LEVELS } from '../../game/content.js';
import { levelInfo, tierForLevel, equipmentSprite } from '../../game/rules.js';
import { avatarImg, screenHeader } from '../components.js';

export const background = 'sanctuary';

export function render({ profile: p }) {
  const unlocked = p.inventory.includes('tunica_novicio');
  return `
    <div class="equipment">
      ${screenHeader('Equipo', 'Cada pilar forja una pieza. Sube el pilar para mejorar su tier.')}
      <div class="equip-grid">
        <div class="panel pedestal-box">
          <div class="pedestal">${avatarImg(p, { cls: 'big idle' })}</div>
          ${unlocked ? '<p class="small center">✦ Túnica del Novicio equipada</p>' : '<p class="small center muted">Completa el tutorial para recibir tu primer equipo.</p>'}
        </div>
        <div class="panel">
          ${Object.entries(EQUIPMENT).map(([pillar, eq]) => {
            const lv = levelInfo(p.pillarXp[pillar]).level;
            const tier = tierForLevel(lv);
            return `
              <div class="equip-row">
                <div class="equip-slot"><b>${eq.slot}</b><span class="small" style="color:${PILLARS[pillar].color}">${PILLARS[pillar].name} · Nv ${lv}</span></div>
                <div class="tiers">
                  ${eq.tiers.map((name, i) => `
                    <div class="tier ${i + 1 <= tier && unlocked ? 'owned' : 'locked'} ${i + 1 === tier && unlocked ? 'current' : ''}" title="${name} (Nv ${TIER_LEVELS[i]})">
                      <img class="pixel" src="${equipmentSprite(pillar, i + 1)}" alt="${name}">
                      <span>${i + 1 <= tier && unlocked ? name : `Nv ${TIER_LEVELS[i]}`}</span>
                    </div>`).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

export const actions = {};
