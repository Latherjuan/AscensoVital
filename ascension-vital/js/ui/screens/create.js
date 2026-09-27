// Creacion y edicion de personaje (Capa A: piel, peinado, tinte, rasgo, tunica).
import * as A from '../../game/actions.js';
import {
  AVATAR_OPTIONS, HAIR_STYLE_NAMES, HAIR_COLOR_NAMES, FEATURE_NAMES, TUNIC_NAMES,
} from '../../game/content.js';
import { gear } from '../../game/rules.js';
import { avatarDataUrl, SKIN, HAIR, TUNIC } from '../avatar.js';
import { esc, confirmModal, toast } from '../fx.js';
import { sfx } from '../audio.js';
import { screenHeader } from '../components.js';

let draft = null;
let draftFor = null;

const DEFAULT = { skinTone: 2, hairStyle: 1, hairColor: 1, facialFeature: 0, baseTunicColor: 1 };

function ensureDraft(profile) {
  const owner = profile?.id ?? 'new';
  if (draftFor !== owner || !draft) {
    draft = { name: profile?.name ?? '', avatar: { ...(profile?.avatar ?? DEFAULT) } };
    draftFor = owner;
  }
}

function optionLabel(key, v) {
  switch (key) {
    case 'skinTone': return `<span class="swatch" style="background:${SKIN[v - 1]}"></span>Tono ${v}`;
    case 'hairStyle': return HAIR_STYLE_NAMES[v];
    case 'hairColor': return `<span class="swatch" style="background:${HAIR[v - 1]}"></span>${HAIR_COLOR_NAMES[v - 1]}`;
    case 'facialFeature': return FEATURE_NAMES[v];
    case 'baseTunicColor': return `<span class="swatch" style="background:${TUNIC[v - 1]}"></span>${TUNIC_NAMES[v - 1]}`;
    default: return v;
  }
}

function preview(profile) {
  const withGear = profile?.inventory.includes('tunica_novicio');
  return avatarDataUrl(draft.avatar, { gear: withGear ? gear(profile) : null });
}

export function render({ profile }) {
  const editing = !!profile;
  ensureDraft(profile);
  return `
    <div class="create-screen ${editing ? '' : 'standalone'}">
      ${screenHeader(editing ? 'Perfil y avatar' : 'Crea tu personaje', editing ? 'Tu Capa A (identidad base) puede cambiar cuando quieras.' : 'Así te verás en tu viaje de ascensión.')}
      <div class="create-grid">
        <div class="pedestal-box panel">
          <div class="pedestal">
            <img class="pixel avatar big idle" id="create-preview" src="${preview(profile)}" alt="Vista previa">
          </div>
          <button class="btn small" data-action="random">🎲 Aleatorio</button>
        </div>
        <div class="panel create-form">
          <label class="field">
            <span>Nombre</span>
            <input id="hero-name" maxlength="18" placeholder="¿Cómo te llamas, viajero?" value="${esc(draft.name)}" autocomplete="off">
          </label>
          ${Object.entries(AVATAR_OPTIONS).map(([key, o]) => `
            <div class="option-row">
              <span class="option-label">${o.label}</span>
              <button class="btn icon" data-action="cycle" data-key="${key}" data-dir="-1" aria-label="Anterior">◀</button>
              <span class="option-value" id="opt-${key}">${optionLabel(key, draft.avatar[key])}</span>
              <button class="btn icon" data-action="cycle" data-key="${key}" data-dir="1" aria-label="Siguiente">▶</button>
            </div>`).join('')}
          <div class="row end gap">
            ${editing
              ? '<button class="btn primary" data-action="save">Guardar cambios</button>'
              : '<button class="btn" data-action="back">Volver</button><button class="btn primary" data-action="start">Comenzar aventura ▶</button>'}
          </div>
        </div>
      </div>
      ${editing ? `
        <div class="panel">
          <h2 class="title-sm">Partida</h2>
          <div class="row wrap gap">
            <button class="btn" data-action="switch">Cambiar de partida</button>
            <button class="btn" data-action="export">Exportar datos (JSON)</button>
            <button class="btn danger" data-action="delete">Borrar esta partida</button>
          </div>
        </div>` : ''}
    </div>`;
}

export function mount(root) {
  root.querySelector('#hero-name')?.addEventListener('input', (e) => { draft.name = e.target.value; });
}

function refresh(profile) {
  document.getElementById('create-preview').src = preview(profile);
  for (const key of Object.keys(AVATAR_OPTIONS)) document.getElementById(`opt-${key}`).innerHTML = optionLabel(key, draft.avatar[key]);
}

export const actions = {
  cycle: (el, ctx) => {
    const { key, dir } = el.dataset;
    const o = AVATAR_OPTIONS[key];
    const span = o.max - o.min + 1;
    draft.avatar[key] = ((draft.avatar[key] - o.min + Number(dir) + span) % span) + o.min;
    sfx('blip');
    refresh(ctx.profile);
  },
  random: (_el, ctx) => {
    for (const [key, o] of Object.entries(AVATAR_OPTIONS)) draft.avatar[key] = o.min + Math.floor(Math.random() * (o.max - o.min + 1));
    sfx('select');
    refresh(ctx.profile);
  },
  back: (_el, ctx) => { draft = null; ctx.go('inicio'); },
  start: (_el, ctx) => {
    if (!draft.name.trim()) {
      sfx('error');
      toast('Escribe un nombre para tu personaje.');
      document.getElementById('hero-name').focus();
      return;
    }
    sfx('chest');
    A.createProfile(draft.name, draft.avatar);
    draft = null;
    ctx.go('santuario');
  },
  save: (_el, ctx) => {
    A.saveAvatar(draft.avatar, draft.name);
    sfx('xp');
    toast('Avatar guardado.');
    draft = null;
    ctx.rerender();
  },
  switch: (_el, ctx) => { A.logout(); draft = null; ctx.go('inicio'); },
  export: (_el, ctx) => {
    const blob = new Blob([JSON.stringify(ctx.profile, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ascension-vital-${ctx.profile.name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  delete: async (_el, ctx) => {
    if (await confirmModal(`¿Borrar la partida de <b>${esc(ctx.profile.name)}</b>? Esta acción no se puede deshacer.`, { ok: 'Borrar', danger: true })) {
      A.deleteProfile(ctx.profile.id);
      draft = null;
      ctx.go('inicio');
    }
  },
};
