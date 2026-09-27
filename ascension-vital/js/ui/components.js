// Componentes HTML reutilizables.
import { PILLARS, PILLAR_IDS } from '../game/content.js';
import { levelInfo, gear } from '../game/rules.js';
import { avatarDataUrl } from './avatar.js';
import { esc } from './fx.js';

export function avatarImg(profile, { cls = '', withGear = true, bust = false } = {}) {
  const hasGear = withGear && profile.inventory.includes('tunica_novicio');
  const url = avatarDataUrl(profile.avatar, { gear: hasGear ? gear(profile) : null, bust });
  return `<img class="pixel avatar ${cls}" src="${url}" alt="Avatar de ${esc(profile.name)}">`;
}

/** Hexagono de los 6 pilares (radar SVG). El pilar mas debil se resalta. */
export function hexagon(profile, weakest = []) {
  const size = 220;
  const c = size / 2;
  const R = 84;
  const levels = PILLAR_IDS.map((p) => levelInfo(profile.pillarXp[p]));
  const maxLv = Math.max(5, ...levels.map((l) => l.level + l.pct));
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  };
  const ring = (f) => PILLAR_IDS.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const shape = levels.map((l, i) => pt(i, R * Math.max(0.08, (l.level + l.pct) / maxLv)).join(',')).join(' ');
  const labels = PILLAR_IDS.map((p, i) => {
    const [x, y] = pt(i, R + 20);
    const weak = weakest.includes(p);
    return `<text x="${x}" y="${y}" class="hex-label ${weak ? 'weak' : ''}" fill="${PILLARS[p].color}">${PILLARS[p].short} ${levels[i].level}</text>`;
  }).join('');
  return `
    <svg class="hexagon" viewBox="0 0 ${size} ${size}" role="img" aria-label="Hexágono de pilares">
      ${[1, 0.66, 0.33].map((f) => `<polygon points="${ring(f)}" class="hex-ring"/>`).join('')}
      ${PILLAR_IDS.map((_, i) => `<line x1="${c}" y1="${c}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="hex-axis"/>`).join('')}
      <polygon points="${shape}" class="hex-shape"/>
      ${labels}
    </svg>`;
}

export function bar(pct, { color = '#6fe36b', label = '', cls = '' } = {}) {
  const w = Math.max(0, Math.min(100, pct * 100));
  return `<div class="bar ${cls}"><div class="bar-fill" style="width:${w}%;background:${color}"></div>${label ? `<span class="bar-label">${label}</span>` : ''}</div>`;
}

export function pillarRow(profile, p, { weak = false } = {}) {
  const info = levelInfo(profile.pillarXp[p]);
  return `
    <div class="pillar-row ${weak ? 'weak' : ''}">
      <img class="pixel pillar-icon" src="assets/ui/pillar_${p}.png" alt="">
      <div class="grow">
        <div class="row between"><b>${PILLARS[p].name}</b><span class="lv">Nv ${info.level}</span></div>
        ${bar(info.pct, { color: PILLARS[p].color, label: `${info.current}/${info.needed}` })}
      </div>
    </div>`;
}

export function pillarChip(p) {
  return `<span class="chip" style="--c:${PILLARS[p].color}">${PILLARS[p].name}</span>`;
}

export function screenHeader(title, subtitle = '') {
  return `<header class="screen-head"><h1 class="title">${title}</h1>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</header>`;
}
