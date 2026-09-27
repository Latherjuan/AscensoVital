// Capa de efectos: dialogo de Venus (typewriter), texto flotante de XP, cofres, banners y modales.
import { PILLARS, EQUIPMENT } from '../game/content.js';
import { equipmentSprite } from '../game/rules.js';
import { sfx } from './audio.js';

const $ = (sel) => document.querySelector(sel);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Dialogo de Venus ----------
let venusBusy = false;

/**
 * Muestra una secuencia de lineas de Venus. En la ultima linea puede ofrecer botones.
 * @param {string[]} lines
 * @param {{ choices?: {label: string, value: any}[], blocking?: boolean }} opts
 * @returns {Promise<any>} valor del boton elegido (o true)
 */
export function venusSay(lines, { choices = null, blocking = true } = {}) {
  const layer = $('#venus-layer');
  venusBusy = true;
  return new Promise((resolve) => {
    let i = 0;
    let typing = null;
    let full = false;
    layer.innerHTML = `
      <div class="venus-backdrop ${blocking ? 'blocking' : ''}"></div>
      <div class="venus-dialog">
        <img class="venus-portrait" src="assets/ui/venus.png" alt="Venus">
        <div class="dialog-box">
          <div class="dialog-name">VENUS</div>
          <div class="dialog-text"></div>
          <div class="dialog-choices"></div>
          <div class="dialog-cursor">▶</div>
        </div>
      </div>`;
    const textEl = layer.querySelector('.dialog-text');
    const choicesEl = layer.querySelector('.dialog-choices');
    const cursor = layer.querySelector('.dialog-cursor');

    const finish = (value) => {
      clearInterval(typing);
      document.removeEventListener('keydown', onKey);
      layer.innerHTML = '';
      venusBusy = false;
      resolve(value);
    };
    const showChoices = () => {
      if (i !== lines.length - 1 || !choices) return;
      cursor.hidden = true;
      choicesEl.innerHTML = choices.map((c, k) => `<button class="btn ${k === 0 ? 'primary' : ''}" data-k="${k}">${esc(c.label)}</button>`).join('');
      choicesEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx('select');
        finish(choices[Number(b.dataset.k)].value);
      }));
    };
    const type = () => {
      const line = lines[i];
      let n = 0;
      full = false;
      textEl.textContent = '';
      choicesEl.innerHTML = '';
      cursor.hidden = true;
      clearInterval(typing);
      typing = setInterval(() => {
        n++;
        textEl.textContent = line.slice(0, n);
        if (n % 3 === 0) sfx('text');
        if (n >= line.length) {
          clearInterval(typing);
          full = true;
          cursor.hidden = false;
          showChoices();
        }
      }, 22);
    };
    const advance = () => {
      if (!full) {
        clearInterval(typing);
        textEl.textContent = lines[i];
        full = true;
        cursor.hidden = false;
        showChoices();
        return;
      }
      if (i === lines.length - 1 && choices) return;
      sfx('blip');
      i++;
      if (i >= lines.length) finish(true);
      else type();
    };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } };
    layer.querySelector('.venus-dialog').addEventListener('click', advance);
    document.addEventListener('keydown', onKey);
    type();
  });
}
export const isVenusBusy = () => venusBusy;

// ---------- Texto flotante / banners ----------
export function floatText(text, { color = '#ffe66b', x = null, y = null, big = false } = {}) {
  const el = document.createElement('div');
  el.className = `float-text ${big ? 'big' : ''}`;
  // la fuente pixel no trae mayusculas acentuadas
  el.textContent = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  el.style.color = color;
  el.style.left = `${x ?? window.innerWidth / 2}px`;
  el.style.top = `${y ?? window.innerHeight / 2.4}px`;
  $('#fx-layer').appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

export function toast(html, { icon = null, tone = 'info' } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.innerHTML = `${icon ? `<img class="pixel" src="${icon}" alt="">` : ''}<div>${html}</div>`;
  $('#toast-layer').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4200);
}

// ---------- Modales ----------
export function openModal(html, { className = '' } = {}) {
  const layer = $('#modal-layer');
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal panel ${className}">${html}</div>`;
  layer.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  return { el: wrap.querySelector('.modal'), close };
}

export function confirmModal(text, { ok = 'Aceptar', cancel = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = openModal(`<p>${text}</p><div class="row end"><button class="btn" data-v="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-v="1">${esc(ok)}</button></div>`);
    m.el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { m.close(); resolve(b.dataset.v === '1'); }));
  });
}

/** Cofre de loot: cerrado -> se abre al tocar -> muestra el objeto. */
export function openChest(itemName) {
  return new Promise((resolve) => {
    sfx('select');
    const m = openModal(`
      <h2 class="title-sm">¡Cofre de botín!</h2>
      <button class="chest-btn" aria-label="Abrir cofre"><img class="pixel chest-img wobble" src="assets/ui/chest_closed.png" alt=""></button>
      <p class="muted chest-hint">Toca el cofre para abrirlo</p>
      <div class="chest-reward" hidden></div>`, { className: 'chest-modal' });
    const img = m.el.querySelector('.chest-img');
    const reward = m.el.querySelector('.chest-reward');
    let opened = false;
    m.el.querySelector('.chest-btn').addEventListener('click', () => {
      if (opened) return;
      opened = true;
      img.classList.remove('wobble');
      img.src = 'assets/ui/chest_cracked.png';
      sfx('hit');
      setTimeout(() => {
        img.src = 'assets/ui/chest_gold.png';
        img.classList.add('glow');
        sfx('chest');
        m.el.querySelector('.chest-hint').hidden = true;
        reward.hidden = false;
        reward.innerHTML = `<p class="loot-name">✦ ${esc(itemName)} ✦</p><button class="btn primary">¡Genial!</button>`;
        reward.querySelector('button').addEventListener('click', () => { m.close(); resolve(); });
      }, 450);
    });
  });
}

/** Anima los eventos devueltos por las acciones del juego. */
export async function playEvents(ev, anchor = null) {
  if (!ev) return;
  // anchor puede ser un elemento (si sigue en el DOM) o un DOMRect capturado antes de re-renderizar
  const rect = anchor instanceof Element ? (anchor.isConnected ? anchor.getBoundingClientRect() : null) : anchor;
  const x = rect ? rect.left + rect.width / 2 : null;
  const y = rect ? rect.top : null;
  ev.xp.forEach((g, i) => setTimeout(() => {
    floatText(`+${g.amount} XP ${PILLARS[g.pillar].name.toUpperCase()}!`, { color: PILLARS[g.pillar].color, x, y: y !== null ? y - i * 28 : null, big: true });
    if (g.humble) floatText('×1.25 HUMILDAD', { color: '#ff9ad5', x, y: (y ?? window.innerHeight / 2.4) + 34 });
  }, i * 260));
  if (ev.xp.length) sfx('xp');
  ev.pillarLevelUps.forEach((l) => toast(`<b>${PILLARS[l.pillar].name}</b> sube a nivel <b>${l.level}</b>`, { icon: `assets/ui/pillar_${l.pillar}.png`, tone: 'gold' }));
  ev.newGear.forEach((g) => toast(`Nuevo equipo: <b>${esc(g.name)}</b> (${EQUIPMENT[g.pillar].slot} T${g.tier})`, { icon: equipmentSprite(g.pillar, g.tier), tone: 'gold' }));
  if (ev.overallLevelUp) {
    setTimeout(() => {
      sfx('levelup');
      floatText(`¡NIVEL GENERAL ${ev.overallLevelUp}!`, { color: '#fff3b0', big: true });
    }, 600);
  }
  if (ev.chest) {
    await new Promise((r) => setTimeout(r, 900));
    await openChest(ev.chest.item);
  }
}
