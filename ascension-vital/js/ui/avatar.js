// Avatar HD por capas (assets/avatar, generadas por tools/process_avatar.py).
// Capa A: piel (recoloreo), peinado y rasgos (tinte), tunica (tinte).
// Capa B: equipamiento por tier. Todas las capas comparten la misma rejilla logica.

export const SKIN = ['#f7d7b8', '#ecbd94', '#d69d6e', '#b87a4f', '#8b5a37', '#5d3b25'];
export const HAIR = ['#6e4022', '#e7c04a', '#b5361f', '#2a2530', '#2f63d4', '#dcdde6'];
export const TUNIC = ['#8b5a33', '#3e8f3b', '#3b63b3'];
const MATERIAL = { linen: '#a88a60', leather: '#8a5a33', canvas: '#6b7d4a' };

// Desplazamiento de luminosidad de la piel del maniqui para cada tono (1-6)
const SKIN_SHIFT = [0.16, 0.08, 0, -0.1, -0.2, -0.28];

/** Peinado (1-8) -> capas. Se ajusto a lo que produjo el cuaderno de arte. */
const HAIR_STYLES = {
  0: {}, // calvo
  1: { front: 'hair_front_1' },
  2: { front: 'hair_front_2', back: 'hair_back_2' },
  3: { front: 'hair_front_6', back: 'hair_back_6' },
  4: { front: 'hair_front_4', back: 'hair_back_4' },
  5: { front: 'hair_front_5' },
  6: { front: 'hair_front_7' },
  7: { front: 'hair_front_7_big' },
  8: { front: 'hair_front_8' },
};
const FEATURES = { 1: ['face_glasses'], 2: ['face_beard'], 3: ['face_freckles'], 4: ['face_scar'], 5: ['face_mustache'], 6: ['face_beard', 'face_glasses'] };

let manifest = null;
const images = {};
const cache = new Map();

/** Carga todas las capas. Debe resolverse antes del primer render. */
export async function preloadAvatar() {
  manifest = await fetch('assets/avatar/manifest.json').then((r) => r.json());
  await Promise.all(manifest.layers.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[name] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = `assets/avatar/${name}.png`;
  })));
}

// ---------- utilidades de color ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export function shade(hex, amt) {
  const c = hexToRgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v + amt))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Pixeles de una capa como ImageData (cacheado por capa+transformacion). */
function layerData(name, transform, key) {
  const ck = `${name}|${key}`;
  if (cache.has(ck)) return cache.get(ck);
  const img = images[name];
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  if (transform) {
    const data = ctx.getImageData(0, 0, c.width, c.height);
    transform(data.data);
    ctx.putImageData(data, 0, 0);
  }
  cache.set(ck, c);
  return c;
}

/** Mapa de degradado: la escala de grises se convierte en sombras/medios/luces del color. */
function tintGray(hex) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return (d) => {
    let lo = 1;
    let hi = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const v = (d[i] + d[i + 1] + d[i + 2]) / 765;
      if (v < 0.16) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const span = Math.max(0.05, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const v = (d[i] + d[i + 1] + d[i + 2]) / 765;
      if (v < 0.16) continue; // contorno
      const t = (v - lo) / span; // 0 sombra .. 1 luz
      const L = Math.min(0.93, Math.max(0.06, l * (0.55 + t * 0.75)));
      const [r, g, b] = hslToRgb(h, s, L);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  };
}

function reskin(shift) {
  return (d) => {
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (h > 0.02 && h < 0.11 && s > 0.25 && l > 0.25) {
        const [r, g, b] = hslToRgb(h, s, Math.min(0.9, Math.max(0.12, l + shift)));
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
      }
    }
  };
}

function draw(ctx, name, a) {
  const tint = manifest.tint[name];
  let c;
  if (tint === 'hair') c = layerData(name, tintGray(HAIR[a.hairColor - 1] ?? HAIR[0]), `h${a.hairColor}`);
  else if (tint === 'tunic') c = layerData(name, tintGray(TUNIC[a.baseTunicColor - 1] ?? TUNIC[0]), `t${a.baseTunicColor}`);
  else if (MATERIAL[tint]) c = layerData(name, tintGray(MATERIAL[tint]), tint);
  else if (name === 'body_base') c = layerData(name, reskin(SKIN_SHIFT[a.skinTone - 1] ?? 0), `s${a.skinTone}`);
  else c = layerData(name, null, '');
  if (c) ctx.drawImage(c, 0, 0);
}

/**
 * @param {import('../../types/game').AvatarLayerA} a
 * @param {{ gear?: import('../../types/game').EquipmentGear | null, novice?: boolean, bust?: boolean }} opts
 */
export function avatarDataUrl(a, { gear = null, bust = false } = {}) {
  if (!manifest) return '';
  const key = JSON.stringify([a, gear, bust]);
  if (cache.has(key)) return cache.get(key);
  const size = manifest.size;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const hair = HAIR_STYLES[a.hairStyle] ?? HAIR_STYLES[1];
  const helm = gear?.conscienciaHelmTier;

  const order = [
    // El morral no se dibuja en el avatar hasta tener su version frontal (correa + bolso a un costado);
    // mientras tanto se muestra solo en la pantalla de Equipo.
    hair.back,
    // mitad trasera de aros (diadema): queda detras de la cabeza
    gear && manifest.layers.includes(`helm_t${helm}_back`) && `helm_t${helm}_back`,
    'body_base',
    'tunic_base',
    gear && `armor_t${gear.fisiologicaArmorTier}`,
    gear && `boots_t${gear.fisicaBootsTier}`,
    ...(FEATURES[a.facialFeature] ?? []),
    helm === 3 ? null : hair.front,
    gear && `helm_t${helm}`,
    gear && `shield_t${gear.autoestimaShieldTier}`,
    gear && `weapon_t${gear.prosperidadWeaponTier}`,
    gear && 'hands_front',
  ];
  for (const name of order) if (name) draw(ctx, name, a);

  let out = canvas;
  if (bust) {
    // retrato: cabeza y hombros
    const s = Math.round(size * 0.56);
    out = document.createElement('canvas');
    out.width = s;
    out.height = s;
    out.getContext('2d').drawImage(canvas, Math.round(size * 0.22), Math.round(size * 0.02), s, s, 0, 0, s, s);
  }
  const url = out.toDataURL();
  cache.set(key, url);
  return url;
}
