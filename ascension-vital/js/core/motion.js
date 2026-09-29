// Sensor de pasos (Modulo 2): detecta picos de aceleracion via DeviceMotion. Vive a nivel de
// app (no atado a la pantalla de Caminata) para seguir contando sin importar donde navegue el
// usuario, mientras la pestaña siga abierta. La preferencia de encendido se guarda en
// settings.stepSensor para reactivarse solo en el siguiente arranque.
import * as A from '../game/actions.js';
import { STEPS_PER_MINUTE } from '../game/content.js';

let sensorOn = false;
let steps = 0;
let below = true;
let lastStep = 0;

export const isStepSensorOn = () => sensorOn;
export const getSteps = () => steps;

function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a) return;
  const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
  const now = performance.now();
  if (below && mag > 11.8 && now - lastStep > 280) {
    below = false;
    lastStep = now;
    steps++;
    const el = document.getElementById('step-count');
    if (el) el.textContent = steps;
    if (steps % STEPS_PER_MINUTE === 0) A.addWalkMinutes(1);
  } else if (mag < 10.2) {
    below = true;
  }
}

/** @returns {Promise<boolean>} si quedo activo */
export async function enableStepSensor() {
  if (sensorOn) return true;
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const res = await DeviceMotionEvent.requestPermission();
      if (res !== 'granted') throw new Error('denied');
    }
    if (typeof DeviceMotionEvent === 'undefined') throw new Error('unsupported');
    window.addEventListener('devicemotion', onMotion);
    sensorOn = true;
    A.setSetting('stepSensor', true);
    return true;
  } catch {
    return false;
  }
}

export function disableStepSensor() {
  window.removeEventListener('devicemotion', onMotion);
  sensorOn = false;
  A.setSetting('stepSensor', false);
}
