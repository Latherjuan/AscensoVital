// Inicio de sesion (solo en modo nube).
import * as cloud from '../../core/cloud.js';
import { esc, toast } from '../fx.js';
import { sfx } from '../audio.js';

let message = '';

export function render() {
  return `
    <div class="title-screen">
      <div class="logo">
        <img class="pixel logo-lotus" src="assets/ui/lotus_open.png" alt="">
        <h1>ASCENSION<br>VITAL</h1>
        <p class="tagline">Un RPG de autorregulación y crecimiento personal</p>
      </div>
      <form class="panel login" id="login-form" autocomplete="on">
        <h2 class="title-sm">Entra a tu santuario</h2>
        <label class="field"><span>Correo</span><input id="login-email" type="email" autocomplete="email" required></label>
        <label class="field"><span>Contraseña</span><input id="login-pass" type="password" autocomplete="current-password" minlength="6" required></label>
        ${message ? `<p class="small pink">${esc(message)}</p>` : ''}
        <div class="row gap wrap end">
          <button type="button" class="btn small" data-action="reset">¿Olvidaste la contraseña?</button>
          <button type="button" class="btn" data-action="signup">Crear cuenta</button>
          <button type="submit" class="btn primary">Entrar ▶</button>
        </div>
      </form>
      <p class="muted small">Tus partidas se guardan en tu cuenta y las ves desde cualquier dispositivo.</p>
    </div>`;
}

function values() {
  return {
    email: document.getElementById('login-email').value.trim(),
    password: document.getElementById('login-pass').value,
  };
}

/** @param {(session: any) => void} onSession */
export function mount(root, ctx, onSession) {
  root.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { email, password } = values();
    try {
      const session = await cloud.signIn(email, password);
      sfx('chest');
      message = '';
      onSession(session);
    } catch (err) {
      sfx('error');
      message = /confirm/i.test(err.message) ? 'Confirma tu correo antes de entrar (revisa tu bandeja).' : 'Correo o contraseña incorrectos.';
      ctx.rerender();
    }
  });
}

export const actions = {
  signup: async (_el, ctx) => {
    const { email, password } = values();
    if (!email || password.length < 6) {
      message = 'Escribe tu correo y una contraseña de al menos 6 caracteres.';
      return ctx.rerender();
    }
    try {
      const session = await cloud.signUp(email, password);
      if (session) {
        sfx('chest');
        message = '';
        return ctx.onSession(session);
      }
      message = 'Cuenta creada. Te enviamos un correo para confirmarla; después vuelve y entra.';
    } catch (err) {
      message = /registered/i.test(err.message) ? 'Ese correo ya tiene cuenta: usa «Entrar».' : `No se pudo crear la cuenta: ${err.message}`;
    }
    ctx.rerender();
  },
  reset: async (_el, ctx) => {
    const { email } = values();
    if (!email) {
      message = 'Escribe tu correo y vuelve a tocar «¿Olvidaste la contraseña?».';
      return ctx.rerender();
    }
    try {
      await cloud.resetPassword(email);
      toast('Te enviamos un correo para restablecer la contraseña.');
    } catch (err) {
      message = `No se pudo enviar el correo: ${err.message}`;
      ctx.rerender();
    }
  },
};
