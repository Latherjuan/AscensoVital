# Ascensión Vital — Contexto del proyecto

Documento de traspaso para continuar el trabajo en una sesión nueva. Léelo completo antes de tocar código.

## 1. Qué es

RPG de crecimiento personal con estética SNES 16-bit. El jugador crea un avatar y lo hace crecer
cumpliendo hábitos reales, organizados en un marco neurobiológico de **6 pilares**:
Física, Fisiológica, Social, Autoestima, Consciencia y Prosperidad.

- **Web publicada:** https://latherjuan.github.io/AscensoVital/
- **Repositorio:** https://github.com/Latherjuan/AscensoVital (público, rama `main`)
- **Carpeta local:** `I:\Mi unidad\Crecimiento_personal`
- **Especificación original:** el PDF en la raíz del proyecto.
- El usuario escribe en español; toda la interfaz y los textos del juego están en español.

## 2. Stack y despliegue

- **Frontend:** HTML + CSS + JavaScript con módulos ES nativos, **sin build ni framework**.
  Todo el juego vive en `ascension-vital/`.
- **Local:** doble clic en `ascension-vital/iniciar.bat`, o `python ascension-vital/serve.py`
  (servidor en `localhost:3000` con `Cache-Control: no-store` para que no se queden módulos viejos).
  Para el navegador integrado existe la configuración `ascension-vital-dev` en `.claude/launch.json`.
- **Publicación:** `.github/workflows/pages.yml` publica `ascension-vital/` en GitHub Pages en cada
  push a `main` (también se puede lanzar a mano desde Actions → *Run workflow*).
- **Git:** desde la terminal, Git tiene guardada la cuenta `JKAnimation`, que **no** tiene permiso
  de push sobre el repositorio. El usuario hace los push con **GitHub Desktop** (cuenta `Latherjuan`).
  Haz los commits localmente y pídele que pulse *Push origin*.
- **Supabase** (proyecto `vjfgshondpbcbwqgucqd`):
  - Credenciales en `ascension-vital/js/config.js` (URL + clave `anon`, pública por diseño).
    Nunca uses ni pidas la `service_role`.
  - Tabla `public.app_state` (`user_id` uuid PK → `auth.users`, `state` jsonb, `updated_at`),
    con RLS: cada usuario solo lee y escribe su fila. Esquema en `ascension-vital/supabase/schema.sql`.
  - Tabla `public.boss_templates` (catálogo de jefes, de solo lectura pública): ver sección 4
    "Cómo agregar un jefe nuevo" más abajo.
  - Autenticación por correo y contraseña, con confirmación de correo activada.
  - SMTP propio con Gmail (`smtp.gmail.com:587`, contraseña de aplicación) para que lleguen los
    correos de confirmación y de "olvidé mi contraseña". El SMTP por defecto de Supabase no los entregaba.
  - *Site URL* y *Redirect URLs* apuntan a la web de GitHub Pages (y a `http://localhost:3000`).

## 3. Arquitectura

```
ascension-vital/
  index.html, serve.py, iniciar.bat
  css/styles.css              tema SNES (paneles biselados, botones, hexágono, animaciones)
  js/config.js                credenciales Supabase; CLOUD_ENABLED
  js/main.js                  arranque, login/sesión, router por hash, shell con menú lateral,
                              tutorial, buzón de Venus, proceso diario cada 60 s
  js/core/store.js            store estilo Zustand (getState/update/subscribe/flush/setRepository)
  js/core/repository.js       LocalRepository (localStorage, clave ascension_vital_state_v1)
  js/core/cloud.js            cliente Supabase + SupabaseRepository (misma interfaz load/save)
  js/game/content.js          constantes: pilares, fases, hábitos por defecto, DEFAULT_BOSS_TEMPLATES
                              (respaldo local de jefes), WALK_BOSSES, Ho'oponopono, píldoras, avatar
  js/game/bossCatalog.js      catálogo de jefes: usa la tabla boss_templates de Supabase si hay
                              conexión, y si no cae en DEFAULT_BOSS_TEMPLATES
  js/game/rules.js            cálculos puros: niveles, cuello de botella, tiers, estado de jefes,
                              questTaskStats (avance de una quest por tareas)
  js/game/actions.js          todas las mutaciones del juego (hábitos, jefes/tareas, caminata, días, dev)
  js/ui/avatar.js             compone el avatar por capas PNG y tiñe en tiempo real
  js/ui/components.js         avatarImg, hexágono, filas de pilar...
  js/ui/screens/*.js          una pantalla por módulo (ver abajo)
  assets/avatar/              45 capas PNG + manifest.json (generadas por tools/process_avatar.py)
  types/game.d.ts             tipos del dominio
tools/process_avatar.py       limpia fondos/textos del arte fuente y alinea cada pieza a las anclas
                              del maniquí (tabla FIT); soporta assets_avatar_ronda2/
tools/process_assets.py       recorta los sprites de assets_optimizados_snes_rpg
ascension-vital/supabase/schema.sql
requerimientos_avatar_hd.md   especificación de arte del avatar (Ronda 1 y Ronda 2)
```

**Pantallas (rutas `#/...`):** `login`, `inicio` (partidas), `crear` (avatar), `santuario` (panel
principal con hexágono y cuello de botella), `misiones` (hábitos del día + autocompasión),
`jefes` (quests/jefes), `caminata`, `espiritu` (Ho'oponopono), `habitos` (rampa de fases),
`equipo` (Capa B), `perfil`, `dev` (controles de prueba).

**Persistencia:** toda pasa por la interfaz `Repository` (`load`/`save`). Con sesión iniciada se usa
`SupabaseRepository`: guarda una copia local por usuario (`ascension_vital_state_v1_<userId>`) y
sube el estado completo a `app_state`. Cada guardado lleva `_savedAt`; al cargar gana la copia más
reciente (local o remota). Se sube a los 350 ms, al ocultar la pestaña, en `pagehide` y cada 5 s si
hay cambios pendientes. Esto corrigió la pérdida de progreso entre sesiones (commit `bb2d810`);
falta que el usuario confirme que ya no pierde avance.

## 4. Reglas del juego implementadas

- **Nivel general** = mínimo de los 6 pilares + bono de armonía (regla del cuello de botella).
- **Rampa de hábitos:** Semilla → Consolidación → Maestría, 14 días por fase; Venus propone el ascenso.
- **Racha** con hasta 3 escudos que se consumen en días de inactividad en lugar de romperla.
- **Autocompasión / humildad:** reportar un tropiezo da +25 % de XP en las 3 misiones siguientes.
- **Ho'oponopono:** 4 frases y la palabra clave "Flor de loto"; píldoras espirituales diarias.
- **Jefes (quests):** se desglosan en **tareas** con tiempo asignado (minutos) y una **fecha
  objetivo**, en vez de días/dosis fijas. Cada tarea completada golpea al jefe según su peso en
  minutos sobre el total (5 estados de salud, igual que antes) y da 1 XP por minuto repartido
  entre los pilares elegidos al crear la quest. Se pueden agregar o quitar tareas mientras la
  quest sigue activa (solo las pendientes se pueden quitar; una tarea ya hecha no se puede
  deshacer). Remate final disponible al completar el 80 % del tiempo total, dejando las tareas
  pendientes sin hacer. Recompensa extra al vencerlo (60 % del tiempo total en XP) con un bono
  del 15 % si se termina antes de la fecha objetivo. El catálogo de jefes (nombre, pilares por
  defecto, sprites) es dinámico — ver "Cómo agregar un jefe nuevo" abajo.
- **Caminata:** 10 gólems diarios progresivos (10 → 60 min), cada uno con material y escala propios;
  tarjeta del próximo rival; minutos acumulados se aplican como "ráfaga".
- **Equipo (Capa B):** 6 piezas, una por pilar, en 4 tiers según el nivel del pilar:
  botas (Física), armadura (Fisiológica), morral (Social), escudo (Autoestima),
  casco/diadema (Consciencia), arma (Prosperidad).
- **Avatar (Capa A):** piel 1–6, peinado 0–8 (0 = calvo), color de pelo 1–6, rasgo facial 0–6,
  color de túnica 1–3.

### Cómo agregar un jefe nuevo (sin tocar código ni hacer deploy)

El catálogo vive en la tabla `public.boss_templates` de Supabase (solo lectura pública; sin
políticas de insert/update/delete, así que solo se edita desde el dashboard de Supabase como
project owner — nunca desde la app). Pasos, **una vez creada la tabla** (ver más abajo):

1. **Sprites:** en Supabase → Storage → bucket `boss-sprites` (público), sube 5 imágenes en una
   carpeta con el `id` del jefe: `boss-sprites/<id>/0.png` … `/4.png` (0 = sano, 4 = vencido;
   mismo criterio que los jefes actuales en `assets/bosses/`). Copia la URL pública de esa carpeta.
2. **Fila nueva:** Supabase → Table Editor → `boss_templates` → Insert row:
   - `id`: identificador corto único, ej. `phoenix` (debe coincidir con la carpeta del paso 1).
   - `boss_name`, `example` (placeholder del campo "Tu reto"), `pillars` (array de 1-2 ids de
     pilar: `fisica`, `fisiologica`, `social`, `autoestima`, `consciencia`, `prosperidad`),
     `states` (array de 5 textos cortos para cada estado de salud).
   - `sprite_base_url`: la URL pública del paso 1.
   - `sort_order`: número para el orden en el selector (opcional).
3. Recarga la web: el jefe nuevo aparece en "Invocar un jefe" en el siguiente `reload`, sin
   commit, sin push, sin esperar el rebuild de GitHub Pages.

**Configuración inicial (solo una vez, y solo si no se ha hecho):** correr el SQL de
`ascension-vital/supabase/schema.sql` (sección `boss_templates`) en el SQL Editor de Supabase, y
crear el bucket público `boss-sprites` en Storage. Los 3 jefes actuales (titán, dragón, espectro)
ya quedan sembrados por ese SQL con `sprite_base_url = null`, así que siguen usando los PNG que
ya están en `assets/bosses/` sin tener que resubir nada.

## 5. Estado del avatar

- Actual: vista **frontal** por capas en una rejilla de 100×100, compuesta en
  `js/ui/avatar.js`. El pelo, la túnica y los materiales se tiñen con un mapa de degradado.
- Problema: las piezas del arte fuente se dibujaron sueltas, así que se ven **sobrepuestas y mal
  ensambladas** en el cuerpo. Se probaron anclas por pieza, botas por pie y diadema partida en dos
  mitades, y el resultado sigue sin ser bueno.
- El **morral no se dibuja** en el avatar (solo aparece en la pantalla de Equipo).
- El usuario empezó un rediseño en **vista 3/4**: en `assets_avatar_3_4_frontal_validacion/` hay una
  primera tanda de validación (`plantilla_silueta_3_4`, `body_base_3_4`, `tunic_base_3_4`,
  `armor_t1_3_4`, `shield_t1_3_4`, `weapon_t1_3_4`). Esa carpeta aún no está en git.

## 6. Pendientes — último feedback del usuario

### Congelado (a propósito, por decisión del usuario)

1. **Ensamble del avatar y sus accesorios / paso a vista 3/4.** Sigue viéndose mal armado. El usuario
   está generando arte nuevo en vista 3/4 (`assets_avatar_3_4_frontal_validacion/`, aún sin buenos
   assets) y pidió **no tocar esto** hasta tener assets terminados. Cuando retome: adaptar
   `tools/process_avatar.py` (anclas y FIT para 3/4), el orden de capas de `js/ui/avatar.js`, y
   `requerimientos_avatar_hd.md`.

2. **Idle del avatar.** La animación de reposo actual se ve rara. Se rehará junto con el punto 1,
   también congelado por ahora.

### Implementado

3. **Backup y restauración del progreso.** Panel "Copia de seguridad" en el Santuario
   (`js/ui/screens/sanctuary.js`): botón para **exportar** el estado completo (todas las partidas del
   dispositivo/cuenta) a un `.json` descargable, y botón para **restaurar** un archivo así (confirma
   antes de sobrescribir). Lógica en `A.exportBackup` / `A.importBackup` (`js/game/actions.js`).

4. **Elegir los pilares que alimenta un jefe.** El modal "Invocar un jefe" tiene checkboxes de los
   6 pilares, precargados según el tipo de jefe pero editables; hay que dejar al menos uno marcado.

5. **Panel de jefes derrotados.** La pantalla de Jefes tiene pestañas "Activos" / "Jefes derrotados";
   la crónica de batallas (vencidos y retirados) vive solo en la segunda pestaña.

6. **Sistema de jefes por tareas (reemplaza el de dosis diarias) + catálogo de jefes en Supabase.**
   Ver el detalle en la sección 4 de arriba y en "Cómo agregar un jefe nuevo". Las quests activas
   con el formato viejo (`dosesPerDay`) se descartan automáticamente al cargar (`migrate()` en
   `js/game/actions.js`) — decisión tomada con el usuario porque solo había datos de prueba.
   **Pendiente de que el usuario corra una vez** el SQL de `boss_templates` en Supabase y cree el
   bucket `boss-sprites` (ver receta arriba) para que el catálogo remoto tenga efecto; mientras
   tanto la app sigue funcionando con el catálogo local de respaldo (titán, dragón, espectro).

Verificado manualmente en el navegador (modo local, `CLOUD_ENABLED` desactivado temporalmente solo
para la prueba). Falta probar el sistema de tareas y el catálogo remoto una vez el usuario haya
corrido el SQL nuevo.

También queda pendiente que el usuario confirme que el progreso ya se conserva entre sesiones y
dispositivos tras el arreglo de sincronización (commit `bb2d810`).
