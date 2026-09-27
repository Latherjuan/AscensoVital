# Ascensión Vital — Requerimientos de arte: Avatar HD por capas + imágenes faltantes

Documento para producir los activos en el cuaderno de Gemini.
Estilo de referencia: **venus-avatar-portrait-v2.png** (pixel art 16-bit SNES, colores cálidos, contorno oscuro).

---

## 0. Reglas globales (aplican a TODAS las imágenes)

1. **Lienzo:** 1024×1024 px.
2. **Fondo:** magenta plano sólido `#FF00FF` (o transparencia real). **NUNCA el patrón de damero gris/blanco** pintado.
3. **Zona libre:** no dibujar nada en los **200 px de la esquina inferior derecha** (ahí aparece la marca de agua).
4. **Un solo elemento por imagen.** Sin textos, etiquetas, títulos ni marcos.
5. **Estilo:** pixel art 16-bit tipo SNES (Chrono Trigger, Final Fantasy VI, Secret of Mana), misma calidad y paleta que Venus. Contorno oscuro de 1 píxel, luz desde arriba a la izquierda.
6. **Sin sombra en el suelo** y sin efectos de fondo.
7. **Nombre de archivo exacto** según las tablas. Guardar todo en la carpeta `assets_avatar_hd/`.

### Frase base para pegar al inicio de cada prompt

> Pixel art 16-bit estilo SNES, misma calidad, paleta y contorno que la imagen de referencia de Venus. Lienzo cuadrado 1024×1024. Fondo magenta plano sólido #FF00FF, sin patrón de damero, sin sombras, sin texto, sin marcos. No dibujes nada en la esquina inferior derecha.

---

## 1. Avatar modular por capas

### 1.1 Cómo funciona

El avatar se arma **apilando capas** en el juego (cuerpo, cabello, ropa, equipo). Para que encajen:

- **Todas las capas deben tener exactamente el mismo encuadre, pose y escala.**
- **El maniquí ya está aprobado** (`body_base.png`). A partir de él se generó `plantilla_silueta.png` (solo el contorno negro del cuerpo sobre magenta).
- Cabello, barba y túnica se dibujan **en escala de grises**: el juego les aplica los colores (6 tintes de cabello, 3 colores de túnica).
- La piel se dibuja en **un tono medio**: el juego genera los 6 tonos.

### 1.2 Estado de la prueba (resultado de la primera entrega)

| Archivo | Estado | Nota |
|---|---|---|
| `body_base.png` | ✅ Aprobado | Pose, encuadre y recoloreo de piel correctos |
| `tunic_base.png` | ✅ Aprobado | Encaja perfecto porque se dibujó sobre la silueta |
| `hair_front_1.png` | ✅ Aprobado | Vino suelto, pero se ajusta a la cabeza automáticamente |
| `armor_t1.png` | 🔁 Rehacer | Vino suelta a lienzo completo: al reducirla pierde el detalle. Rehacer con el **Método A** |
| `hands_front.png` | ❌ Eliminado | No hace falta: las manos se recortan del maniquí |

### 1.3 Los dos métodos de generación

Lo que aprendimos: Gemini **no respeta la posición** si le pasas el maniquí completo, pero **sí encaja** cuando dibuja **encima de un contorno**.

**Método A — Prendas pegadas al cuerpo** (túnica, armaduras, botas, morrales, cabello trasero)
Adjuntar **`plantilla_silueta.png`** y usar:

> [Frase base] La imagen adjunta es el contorno de un personaje. **Viste esta silueta con [PIEZA]**, dibujando la prenda encima del contorno y respetando exactamente su forma, tamaño y posición. Dibuja solo la prenda; el interior de la cabeza, los brazos y las piernas que no cubre la prenda quedan en magenta #FF00FF. No cambies el encuadre.

**Método B — Accesorios sueltos** (cabello delantero, rasgos faciales, cascos, escudos, armas)
No hace falta referencia: yo los escalo y ubico sobre la cabeza o las manos. Usar:

> [Frase base] Dibuja SOLO [PIEZA], aislado, en vista frontal, centrado y ocupando cerca de la mitad del lienzo. Formas claras y legibles, sin detalles diminutos (se verá en tamaño pequeño).

La columna **Método** de cada tabla indica cuál usar.

### 1.5 Cabello

Todo en **escala de grises clara** (de blanco a gris medio, con contorno oscuro).

| Archivo | Método | [PIEZA] |
|---|---|---|
| `hair_front_1.png` | B | ✅ ya entregado |
| `hair_front_2.png` | B | la parte frontal de un cabello largo y liso con flequillo, en escala de grises clara |
| `hair_front_3.png` | B | la parte frontal de un cabello largo ondulado, en escala de grises clara |
| `hair_front_4.png` | B | la parte frontal de una melena corta tipo bob a la altura de la mandíbula, en escala de grises clara |
| `hair_front_5.png` | B | la parte frontal de un cabello recogido en coleta alta, con el lazo de la coleta visible, en escala de grises clara |
| `hair_front_6.png` | B | cabello rapado muy corto pegado al cráneo, en escala de grises clara |
| `hair_front_7.png` | B | cabello afro voluminoso y redondeado, en escala de grises clara |
| `hair_front_8.png` | B | cabello recogido en moño alto, en escala de grises clara |
| `hair_back_2.png` | A | la parte trasera de un cabello largo y liso que cae por detrás de la cabeza y los hombros (lo que asoma por detrás del cuerpo), en escala de grises clara. Adjuntar también `hair_front_2.png` para que combine |
| `hair_back_3.png` | A | la parte trasera de un cabello largo ondulado que cae por detrás de los hombros, en escala de grises clara. Adjuntar también `hair_front_3.png` para que combine |
| `hair_back_4.png` | A | la parte trasera de una melena corta que asoma detrás del cuello, en escala de grises clara. Adjuntar también `hair_front_4.png` para que combine |
| `hair_back_5.png` | A | la coleta que cuelga detrás de la cabeza, en escala de grises clara. Adjuntar también `hair_front_5.png` para que combine |

### 1.6 Rasgos faciales

| Archivo | Método | [PIEZA] |
|---|---|---|
| `face_glasses.png` | B | unas gafas redondas de montura fina sobre los ojos |
| `face_beard.png` | B | una barba completa, en escala de grises clara |
| `face_mustache.png` | B | un bigote, en escala de grises clara |
| `face_freckles.png` | B | pecas suaves en mejillas y nariz |
| `face_scar.png` | B | una pequeña cicatriz diagonal sobre el ojo derecho |
| *(opcional)* `face_happy.png` | ojos y boca con expresión alegre y sonriente (solo los rasgos de la cara) |
| *(opcional)* `face_tired.png` | ojos y boca con expresión cansada pero tranquila (solo los rasgos de la cara) |

### 1.7 Túnica base

| Archivo | Método | [PIEZA] |
|---|---|---|
| `tunic_base.png` | A | ✅ ya entregado |

### 1.8 Equipamiento Capa B (4 tiers por pilar)

El tier 1 es humilde y el tier 4 es legendario, con brillo dorado o místico.

**Armadura — pilar Fisiológica**

| Archivo | Método | [PIEZA] |
|---|---|---|
| `armor_t1.png` | A | una pechera de tela gastada y remendada sobre el torso |
| `armor_t2.png` | A | un peto de cuero endurecido con correas y hebillas |
| `armor_t3.png` | A | una cota de malla de acero con hombreras |
| `armor_t4.png` | A | una armadura de placas de oro sagradas con detalles brillantes y hombreras ornamentadas |

**Botas — pilar Física**

| Archivo | Método | [PIEZA] |
|---|---|---|
| `boots_t1.png` | A | unas sandalias de lino con cintas |
| `boots_t2.png` | A | unas botas de cuero marrón hasta media pantorrilla |
| `boots_t3.png` | A | unas grebas de hierro hasta la rodilla |
| `boots_t4.png` | A | unas botas titánicas doradas con pequeñas alas blancas a los lados |

**Morral — pilar Social**

| Archivo | Método | [PIEZA] |
|---|---|---|
| `bag_t1.png` | A | un zurrón de tela colgado con una correa cruzada sobre el pecho, con el bolso asomando a un costado |
| `bag_t2.png` | A | un morral de explorador de cuero con correa cruzada |
| `bag_t3.png` | A | una mochila comunitaria grande con correas en ambos hombros |
| `bag_t4.png` | A | una mochila mística con orbes luminosos azules flotando alrededor |

**Escudo — pilar Autoestima** (dibujar el escudo solo, de frente)

| Archivo | Método | [PIEZA] |
|---|---|---|
| `shield_t1.png` | B | un broquel redondo de madera |
| `shield_t2.png` | B | un escudo redondo de bronce |
| `shield_t3.png` | B | un escudo de acero en forma de heráldica |
| `shield_t4.png` | B | un escudo espejo de la dignidad, plateado, reflectante y con borde dorado |

**Casco — pilar Consciencia**

| Archivo | Método | [PIEZA] |
|---|---|---|
| `helm_t1.png` | B | una vincha de lino atada en la frente |
| `helm_t2.png` | B | una diadema de bronce con una pequeña gema en la frente |
| `helm_t3.png` | B | un casco ceremonial de acero con penacho (indicar si cubre todo el cabello) |
| `helm_t4.png` | B | una corona dorada con gemas y una aureola luminosa flotando sobre la cabeza |

**Arma — pilar Prosperidad** (se colocará en el puño derecho: dibujar el arma sola, vertical, con la empuñadura abajo)

| Archivo | Método | [PIEZA] |
|---|---|---|
| `weapon_t1.png` | B | una daga sencilla, vertical, empuñadura abajo |
| `weapon_t2.png` | B | una espada corta, vertical, empuñadura abajo |
| `weapon_t3.png` | B | una espada ancha, vertical, empuñadura abajo |
| `weapon_t4.png` | B | el cetro del creador, un bastón dorado con una esfera de luz en la punta, vertical |

**Resumen del avatar:** 1 maniquí + 12 cabello + 5 rasgos + 1 túnica + 24 equipo = **43 imágenes** (3 ya aprobadas; +2 expresiones opcionales).

---

## 2. Otras imágenes que faltan en el juego

Estas **no** llevan el maniquí de referencia. Solo la frase base y la descripción.

### 2.1 Prioridad alta

| Archivo | Prompt (después de la frase base) |
|---|---|
| `pedestal.png` | Pedestal de piedra gris para exhibir a un héroe, visto de frente, con runas talladas que brillan suavemente en dorado. Base ancha y superficie plana arriba. Centrado en la mitad inferior del lienzo. |
| `logo.png` | Logotipo del videojuego con el texto "ASCENSIÓN VITAL" en letras pixel art doradas con contorno oscuro (con la tilde en la Ó bien visible), y una flor de loto rosa detrás del título. Centrado. |
| `nav_santuario.png` | Ícono pequeño de un templo griego con columnas. Centrado y grande dentro del lienzo. |
| `nav_misiones.png` | Ícono de un pergamino enrollado con sello de cera. |
| `nav_jefes.png` | Ícono de dos espadas cruzadas. |
| `nav_caminata.png` | Ícono de huellas de pasos. |
| `nav_espiritu.png` | Ícono de una flor de loto con destellos. |
| `nav_habitos.png` | Ícono de un brote verde saliendo de la tierra. |
| `nav_equipo.png` | Ícono de un peto de armadura. |
| `nav_perfil.png` | Ícono de la silueta de un busto con un marco dorado. |
| `nav_dev.png` | Ícono de un engranaje con una llave inglesa. |
| `phase_semilla.png` | Ícono de una semilla en tierra con un pequeño brote. |
| `phase_consolidacion.png` | Ícono de una planta joven con varias hojas. |
| `phase_maestria.png` | Ícono de un árbol frondoso y fuerte. |
| `icon_streak.png` | Ícono de una llama de fuego naranja y amarilla (racha de días). |
| `item_tunica_novicio.png` | Ícono de objeto de inventario: una túnica de novicio de tela beige con ribete dorado, doblada o extendida. |
| `app_icon.png` | Ícono de aplicación: flor de loto rosa brillante sobre un fondo sólido azul marino oscuro (**este sí lleva fondo azul marino, no magenta**), con destellos dorados. Diseño cuadrado, simple y legible en tamaño pequeño. |

### 2.2 Prioridad media

| Archivo | Prompt (después de la frase base) |
|---|---|
| `venus_happy.png` | Adjuntar `venus-avatar-portrait-v2.png` como referencia. Misma Venus, mismo encuadre, ropa y posición exactos, pero sonriendo con alegría y los ojos entrecerrados de felicidad. |
| `venus_tender.png` | Misma referencia de Venus, mismo encuadre, con expresión tierna y compasiva y la mirada suave (para consolar tras un desliz). |
| `venus_proud.png` | Misma referencia de Venus, mismo encuadre, con expresión orgullosa y una mano cerca del pecho (para celebrar un logro). |
| `bg_trail_day.png` | Escenario de fondo (**sin fondo magenta: escena completa que ocupa todo el lienzo**): sendero de tierra entre colinas verdes, de día, con árboles y cielo azul con nubes. Vista en perspectiva de camino hacia el horizonte. |
| `bg_garden.png` | Escenario de fondo completo: huerto o jardín mágico con bancales, brotes y plantas en distintas etapas de crecimiento, con luz de atardecer cálida. |
| `bg_title.png` | Escenario de fondo completo: templo antiguo en la cima de una montaña al amanecer, con escaleras de piedra, nubes y un resplandor rosa y dorado. Épico y esperanzador. |

> Nota: en los escenarios (`bg_*`) se ignora la regla del fondo magenta, pero se mantiene la de no dibujar nada importante en la esquina inferior derecha.

### 2.3 Prioridad baja (opcional)

| Archivo | Prompt (después de la frase base) |
|---|---|
| `boss_golem_state0.png` … `boss_golem_state4.png` | Gólem del Sendero, criatura de tierra y piedras con musgo y flores, de cuerpo entero y de frente. Generar 5 imágenes con el mismo encuadre: 0 = sano; 1 = con grietas; 2 = inclinado y perdiendo piedras; 3 = arrodillado; 4 = colapsado en un montículo con una flor creciendo encima. |
| `boss_isolation_state0` … `state4` | Sombra del Aislamiento (jefe del pilar Social): figura de niebla gris encerrada en una burbuja, con los mismos 5 estados, hasta 4 = la burbuja rota y la sombra convertida en luz cálida. |
| `boss_mirror_state0` … `state4` | Espejo Crítico (jefe del pilar Autoestima): espejo ornamentado con un rostro severo que juzga, con los mismos 5 estados, hasta 4 = espejo sereno que refleja luz. |

> **Importante para los jefes:** generar **cada estado como imagen separada** con el mismo encuadre (no en una hoja de sprites).

---

## 3. Checklist de entrega

- [x] `body_base.png`, `tunic_base.png` y `hair_front_1.png` aprobados
- [ ] `armor_t1.png` rehecho con el Método A (validar antes de las demás prendas)
- [ ] 12 capas de cabello
- [ ] 5 rasgos faciales (+2 expresiones opcionales)
- [ ] 1 túnica base
- [ ] 24 piezas de equipo (6 pilares × 4 tiers)
- [ ] 17 imágenes de prioridad alta (sección 2.1)
- [ ] 6 imágenes de prioridad media (sección 2.2)
- [ ] (Opcional) jefes adicionales
- [ ] Todo en la carpeta `assets_avatar_hd/` con los nombres exactos
