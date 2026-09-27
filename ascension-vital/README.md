# Ascensión Vital — Prototipo local jugable (Fase 1)

RPG de autorregulación y crecimiento personal con estética SNES 16-bit.
Funciona 100% en el navegador, sin backend ni instalación de dependencias.

## Cómo jugar

1. Doble clic en `iniciar.bat` (o ejecuta `python serve.py`).
2. Abre http://localhost:3000

`serve.py` envía `Cache-Control: no-store`, así que **cada recarga muestra la última versión** de los archivos.
Desde el móvil (misma red Wi-Fi): `http://<IP-de-tu-PC>:3000`.

## Qué incluye

| Módulo | Dónde | Qué hace |
|---|---|---|
| Perfiles | Pantalla de título | 3 ranuras de partida, cada una con su nombre y su avatar |
| Capa A (avatar) | Crear personaje / Perfil | Piel (6), peinado (8), tinte (6), rasgo (0-6), túnica (3) |
| 0 · Tutorial | Al crear partida | Venus guía, UI bloqueada, misión "5 estiramientos", +25 XP, cofre con la Túnica del Novicio |
| 1 · Santuario | Santuario | Pedestal con avatar, Nivel General = min(pilares) + Armonía, hexágono |
| 2 · Caminata | Caminata | 10 gólems diarios (10→60 min), sensor de pasos en móvil, ráfaga de golpes diferida |
| 3 · Espíritu | Espíritu | Meditación Ho'oponopono + palabra gatillo "Flor de loto", píldoras, autocompasión |
| 4 · Rampas | Hábitos | Semilla → Consolidación → Maestría; Venus propone subir a los 14 días; alerta cariñosa a los 7 días |
| 5 · Jefes | Jefes | 100 HP por día, dosis diarias, remate final con ≥80 % de las dosis, 5 estados por jefe |
| 6 · Capa B | Equipo | 6 piezas por pilar, 4 tiers (nivel de pilar 1/3/6/10), audio chiptune |
| Dev Controls | Dev Controls | Avanzar días, simular minutos/pasos, XP por pilar, repetir tutorial |

**Humildad:** reportar un desliz con el flujo de autocompasión no resta XP ni rompe la racha:
activa +25 % de XP durante 3 misiones y recarga un Escudo de Racha (máx. 3).
Cada día sin actividad consume un escudo en lugar de romper la racha.

## Estructura

```
index.html
css/styles.css
js/main.js                 router, menú lateral, tutorial de Venus, buzón de mensajes
js/core/store.js           store estilo Zustand (getState/update/subscribe) + persistencia
js/core/repository.js      LocalRepository (localStorage: ascension_vital_state_v1)
js/game/content.js         pilares, equipo, hábitos base, jefes, textos
js/game/rules.js           reglas puras: niveles, armonía, tiers, jefes, rampas, fechas
js/game/actions.js         acciones del juego (mutan el estado y devuelven eventos)
js/ui/avatar.js            avatar procedural pixel art (Capa A + Capa B)
js/ui/fx.js                diálogo de Venus, XP flotante, cofres, toasts, modales
js/ui/audio.js             efectos y música chiptune (WebAudio)
js/ui/screens/*.js         una pantalla por módulo
types/game.d.ts            tipos del dominio (de la especificación)
assets/                    sprites recortados de assets_optimizados_snes_rpg
```

Los sprites se generan con `python ../tools/process_assets.py`: elimina el damero pintado
y la marca de agua de las hojas originales y recorta cada sprite.

El avatar HD por capas se genera con `python ../tools/process_avatar.py` a partir de
`../assets_avatar_hd_completo/`: limpia fondos y textos, ajusta cada pieza a su ancla del
maniquí (cabeza, torso, pies, manos) y guarda todas las capas en una rejilla común de 100×100
en `assets/avatar/` junto con `manifest.json`. El juego las compone y tiñe en tiempo real
(`js/ui/avatar.js`). Las anclas y tamaños de cada pieza están en la tabla `FIT` del script.

## Hacia Supabase (Fase 2)

Toda la persistencia pasa por `Repository` (`load()` / `save()`), definido en `types/game.d.ts`.
Para migrar basta con crear `SupabaseRepository` con la misma interfaz y cambiar una línea en `main.js`:

```js
const store = createStore(A.initialState(), new SupabaseRepository(supabaseClient));
```

Pasos previstos: Supabase Auth (cada usuario ve sus perfiles), tabla `profiles` con el
perfil como `jsonb` + RLS por `auth.uid()`, y despliegue estático (Vercel/Netlify/Cloudflare Pages).
