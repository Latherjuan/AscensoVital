// Efectos y musica chiptune generados con WebAudio (ondas cuadradas/triangulares, sin archivos).

let ctx = null;
let enabled = true;
let musicTimer = null;

function ac() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setSoundEnabled(on) { enabled = on; }

function tone(freq, start, dur, { type = 'square', vol = 0.06, slide = 0 } = {}) {
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, a.currentTime + start + dur);
  gain.gain.setValueAtTime(vol, a.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

function noise(start, dur, vol = 0.08) {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  const gain = a.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(gain).connect(a.destination);
  src.start(a.currentTime + start);
}

const SFX = {
  blip: () => tone(880, 0, 0.05, { vol: 0.04 }),
  select: () => { tone(660, 0, 0.06); tone(990, 0.06, 0.08); },
  text: () => tone(520 + Math.random() * 80, 0, 0.03, { vol: 0.02 }),
  xp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.12)),
  hit: () => { noise(0, 0.12); tone(180, 0, 0.12, { slide: -120, vol: 0.08 }); },
  chest: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.2, { type: 'triangle', vol: 0.1 })),
  levelup: () => [523, 523, 523, 698, 880, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.18, { vol: 0.07 })),
  heal: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.12, 0.3, { type: 'triangle', vol: 0.08 })),
  error: () => tone(200, 0, 0.15, { slide: -60 }),
};

export function sfx(name) {
  if (!enabled) return;
  try { SFX[name]?.(); } catch { /* audio no disponible */ }
}

// Bucle de musica de santuario: arpegio suave en triangulo + bajo.
const MELODY = [392, 494, 587, 494, 440, 523, 659, 523, 349, 440, 523, 440, 392, 494, 587, 740];
const BASS = [98, 98, 110, 110, 87, 87, 98, 98];
export function setMusic(on) {
  clearInterval(musicTimer);
  musicTimer = null;
  if (!on) return;
  let step = 0;
  musicTimer = setInterval(() => {
    try {
      tone(MELODY[step % MELODY.length], 0, 0.28, { type: 'triangle', vol: 0.035 });
      if (step % 2 === 0) tone(BASS[(step / 2) % BASS.length], 0, 0.5, { type: 'square', vol: 0.02 });
    } catch { /* ignore */ }
    step++;
  }, 300);
}
