// Pilar Social: lista de contactos con avatar propio. Desde cada ficha se abre WhatsApp (mensaje)
// o se llama por telefono, y la interaccion queda registrada como XP del pilar Social.
import * as A from '../../game/actions.js';
import {
  AVATAR_OPTIONS, HAIR_STYLE_NAMES, HAIR_COLOR_NAMES, FEATURE_NAMES, SOCIAL_XP, SOCIAL_MAX_XP_PER_DAY,
} from '../../game/content.js';
import { avatarDataUrl, SKIN, HAIR } from '../avatar.js';
import { screenHeader } from '../components.js';
import { esc, openModal, confirmModal, toast } from '../fx.js';
import { sfx } from '../audio.js';

export const background = 'sanctuary';

const DEFAULT_LOOK = { skinTone: 2, hairStyle: 1, hairColor: 1, facialFeature: 0, baseTunicColor: 1 };
// Contactos usan solo estas opciones de Capa A (la tunica no aplica al retrato).
const LOOK_OPTIONS = ['skinTone', 'hairStyle', 'hairColor', 'facialFeature'];

/**
 * Retrato de un contacto. Unico punto que dibuja avatares de contactos: cuando este listo el
 * sprite sheet propio de contactos, basta con reemplazar esta funcion.
 */
export function contactAvatarUrl(avatar) {
  return avatarDataUrl({ ...DEFAULT_LOOK, ...avatar }, { bust: true });
}

function lookLabel(key, v) {
  switch (key) {
    case 'skinTone': return `<span class="swatch" style="background:${SKIN[v - 1]}"></span>Tono ${v}`;
    case 'hairStyle': return HAIR_STYLE_NAMES[v];
    case 'hairColor': return `<span class="swatch" style="background:${HAIR[v - 1]}"></span>${HAIR_COLOR_NAMES[v - 1]}`;
    case 'facialFeature': return FEATURE_NAMES[v];
    default: return v;
  }
}

const todayInteractions = (p, today) => p.interactions.filter((i) => i.date === today);

export function render({ profile: p, today }) {
  const todays = todayInteractions(p, today);
  const earned = todays.reduce((n, i) => n + i.xp, 0);
  const lastAt = (id) => p.interactions.filter((i) => i.contactId === id).at(-1)?.date;
  return `
    <div class="social">
      ${screenHeader('Vínculos', 'Escribe o llama a quienes quieres. Cada gesto suma XP al pilar Social.')}
      <section class="panel row between wrap gap">
        <span>Hoy: <b>${earned}/${SOCIAL_MAX_XP_PER_DAY} XP</b> social · ${todays.length} interacción(es)</span>
        <span class="muted small">Mensaje +${SOCIAL_XP.message} XP · Llamada +${SOCIAL_XP.call} XP (1.ª vez por contacto y día)</span>
        <button class="btn primary" data-action="add">+ Nuevo contacto</button>
      </section>
      ${p.contacts.length ? `
        <div class="contact-grid">
          ${p.contacts.map((c) => `
            <article class="panel contact-card">
              <img class="pixel avatar contact-avatar" src="${contactAvatarUrl(c.avatar)}" alt="Avatar de ${esc(c.name)}">
              <h2 class="title-sm">${esc(c.name)}</h2>
              <p class="muted small">${lastAt(c.id) ? `Último contacto: ${lastAt(c.id)}` : 'Aún sin interacciones'}</p>
              <div class="row wrap gap center">
                <button class="btn small primary" data-action="message" data-id="${c.id}">💬 WhatsApp</button>
                <button class="btn small" data-action="call" data-id="${c.id}">📞 Llamar</button>
              </div>
              <div class="row wrap gap center">
                <button class="btn small" data-action="edit" data-id="${c.id}">Editar</button>
                <button class="btn small danger" data-action="remove" data-id="${c.id}">Borrar</button>
              </div>
            </article>`).join('')}
        </div>` : `
        <section class="panel"><p class="muted">Aún no tienes contactos. Crea el primero con «Nuevo contacto» y dale su avatar.</p></section>`}
    </div>`;
}

function contactForm(ctx, contact = null) {
  const draft = { name: contact?.name ?? '', phone: contact?.phone ?? '', avatar: { ...DEFAULT_LOOK, ...contact?.avatar } };
  const m = openModal(`
    <h2 class="title-sm">${contact ? 'Editar contacto' : 'Nuevo contacto'}</h2>
    <div class="row gap wrap">
      <img class="pixel avatar contact-avatar" id="c-preview" alt="Vista previa">
      <div style="flex:1;min-width:220px">
        <label class="field"><span>Nombre</span><input id="c-name" maxlength="24" autocomplete="off" value="${esc(draft.name)}"></label>
        <label class="field"><span>WhatsApp (con código de país)</span>
          <input id="c-phone" inputmode="tel" placeholder="Ej.: +57 300 123 4567" autocomplete="off" value="${esc(draft.phone)}"></label>
      </div>
    </div>
    ${LOOK_OPTIONS.map((key) => `
      <div class="option-row">
        <span class="option-label">${AVATAR_OPTIONS[key].label}</span>
        <button class="btn icon" data-k="${key}" data-d="-1" aria-label="Anterior">◀</button>
        <span class="option-value" id="c-opt-${key}"></span>
        <button class="btn icon" data-k="${key}" data-d="1" aria-label="Siguiente">▶</button>
      </div>`).join('')}
    <div class="row end gap">
      <button class="btn" data-cancel>Cancelar</button>
      <button class="btn primary" data-save>Guardar</button>
    </div>`, { className: 'contact-modal' });
  const el = m.el;
  const paint = () => {
    el.querySelector('#c-preview').src = contactAvatarUrl(draft.avatar);
    for (const key of LOOK_OPTIONS) el.querySelector(`#c-opt-${key}`).innerHTML = lookLabel(key, draft.avatar[key]);
  };
  paint();
  el.querySelector('#c-name').addEventListener('input', (e) => { draft.name = e.target.value; });
  el.querySelector('#c-phone').addEventListener('input', (e) => { draft.phone = e.target.value; });
  el.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    const o = AVATAR_OPTIONS[b.dataset.k];
    const span = o.max - o.min + 1;
    draft.avatar[b.dataset.k] = ((draft.avatar[b.dataset.k] - o.min + Number(b.dataset.d) + span) % span) + o.min;
    sfx('blip');
    paint();
  }));
  el.querySelector('[data-cancel]').addEventListener('click', m.close);
  el.querySelector('[data-save]').addEventListener('click', () => {
    if (!draft.name.trim() || A.cleanPhone(draft.phone).length < 7) {
      sfx('error');
      toast('Escribe un nombre y un número válido (con código de país).');
      return;
    }
    A.saveContact({ id: contact?.id, name: draft.name, phone: draft.phone, avatar: draft.avatar });
    m.close();
    sfx('select');
    ctx.rerender();
  });
}

const findContact = (ctx, el) => ctx.profile.contacts.find((c) => c.id === el.dataset.id);

async function interact(kind, el, ctx) {
  const c = findContact(ctx, el);
  if (!c) return;
  // Abrir primero (sincrono con el clic) para que el navegador no bloquee la ventana.
  if (kind === 'message') window.open(`https://wa.me/${c.phone}`, '_blank', 'noopener');
  else window.location.href = `tel:+${c.phone}`;
  const ev = A.logInteraction(c.id, kind);
  ctx.rerender();
  if (ev.interaction?.xp) await ctx.play(ev);
  else toast(ev.interaction?.repeated ? 'Interacción registrada (ya sumaste XP hoy con este contacto).' : 'Interacción registrada (tope diario de XP social alcanzado).');
}

export const actions = {
  add: (_el, ctx) => contactForm(ctx),
  edit: (el, ctx) => contactForm(ctx, findContact(ctx, el)),
  message: (el, ctx) => interact('message', el, ctx),
  call: (el, ctx) => interact('call', el, ctx),
  remove: async (el, ctx) => {
    const c = findContact(ctx, el);
    if (c && await confirmModal(`¿Borrar a <b>${esc(c.name)}</b> de tus contactos?`, { ok: 'Borrar', danger: true })) {
      A.removeContact(c.id);
      ctx.rerender();
    }
  },
};
