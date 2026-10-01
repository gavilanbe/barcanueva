# Barcanueva

Simulador de vida y RPG en pixel art estilo **Game Boy Advance** (240×160), ambientado en una ciudad de fantasía inspirada en Barcelona. Funciona en ordenador y en móvil, con controles táctiles.

## Jugar

```sh
cd ~/barcanueva && python3 -m http.server 8494
# abre http://localhost:8494
```

Es HTML + JavaScript con módulos ES, sin dependencias ni compilación.

| Acción | Teclado | Móvil |
|---|---|---|
| Mover | flechas / WASD | cruceta |
| Hablar, interactuar, confirmar | Z / Espacio / Enter | A |
| Cancelar / correr (mantener) | X / Retroceso | B |
| Menú (cuaderno de viaje) | Esc / C / Tab / Shift | MENÚ |
| Tiradas: «pulso» | A justo cuando el anillo abraza el dado | A |
| Combate: parar un golpe | A o B justo antes del impacto | A / B |
| Combate: golpe especial (seny o rauxa al máximo) | MENÚ | MENÚ |

Para probar sin pasar por la creación: `?quick=tiefling,f&at=pradera,23,20&hour=21&day=23&weather=lluvia` (raza, sexo, mapa, x, y, hora, día y clima).

## Combate

Por turnos, con d20 a lo D&D y tres capas de habilidad y decisión:

- **Pulso**: en cada tirada un anillo se cierra sobre el dado; pulsar A cuando lo abraza suma +1 (fuera de combate) o +2 (en combate). Tres pulsos seguidos dan racha.
- **Paradas**: el rival se prepara, amaga y embiste; pulsar A o B justo antes del impacto bloquea (mitad de daño) o para del todo (sin daño y con contraataque). Pulsar demasiado pronto es «precipitado». DEFENSA y la guardia amplían la ventana.
- **Seny i rauxa**: una balanza entre la calma y el arrebato. Atacar, recibir golpes o que te provoquen empuja a la rauxa (más daño, peor defensa); guardarse, calmar y curar empujan al seny (paras mejor y aciertas más con todo lo que no es pegar). En cada extremo se desbloquea un golpe especial con MENÚ: **¡Rauxa!** (tres golpes al ritmo) o **Seny** (curación, ventaja y lees al rival).
- **Intenciones**: sobre el rival aparece lo que hará el turno siguiente (golpe, embestida cargada, robo, huida…), si sabes leerlo: NATURALEZA o CAZA con las bestias, ARCANO con las criaturas, CARISMA o HISTORIA con las personas.
- **Acciones de folclore** según el rival: ofrecer comida o espantar a una bestia, nombrar a Perot ante un bandolero, darle faena a un follet, rezar ante la Quarantamaula, una plegaria a Sant Jordi (con rosa) contra el drac…

## Estructura

| Archivo | Qué hace |
|---|---|
| `js/main.js` | arranque, título animado, bucle a 60 fps, escalado y ganchos de depuración (`window.__barca`) |
| `js/game.js` | mundo: mapas por capas, cámara suave, entidades, horarios, animales, tiempo, clima, luz, ambiente, emoticonos, pistas de interacción y HUD |
| `js/world.js` | construcción de mapas: ciudad, Monte del Juïc, 5 biomas e interiores generados |
| `js/pal.js`, `js/px.js` | paleta maestra con rampas de tono desplazado, contorno selectivo y primitivas de dibujo a píxel |
| `js/fx.js` | «juice»: curvas, tweens, partículas, temblor, congelación de impacto, destellos, textos flotantes y transiciones |
| `js/tiles.js` | suelo pintado píxel a píxel (bordes orgánicos, estaciones, sombras), decorado y capa superior; agua y hierbas animadas |
| `js/buildings.js`, `js/furniture.js` | edificios (luces de noche, puertas que se abren) y muebles animados |
| `js/chars.js`, `js/portraits.js` | personajes por capas, bustos con expresiones y boca que habla, figuras y bustos de combate |
| `js/sprites.js`, `js/icons.js`, `js/battleart.js` | animales (mapa y combate), iconos de objetos e interfaz, fondos, monstruos y efectos de combate |
| `js/font.js` | fuente de mapa de bits con tildes, ñ, ç y l·l, códigos de color y efectos (`^r`, `^w`…), texto grande y contorneado |
| `js/ui.js` | ventanas animadas por promesas: diálogo con voz y retrato, menús, dado d20 con pulso, avisos, carteles y anuncios |
| `js/audio.js` | síntesis chiptune (pulso, triángulo, ruido), voces, pasos, ambiente, secuenciador y pistas grabadas de `audio/` |
| `js/state.js` | estado serializable, calendario, estadísticas, relaciones y guardado |
| `js/eco.js` | ecosistema vivo basado en individuos |
| `js/talk.js` | conversación: razas, relación, regalos, persuasión, romance, encargos y comercio |
| `js/battle.js` | combate: pulso, paradas, seny i rauxa, intenciones y acciones de folclore |
| `js/activities.js` | recolectar, pescar (picada y lucha), cultivar, cazar, alquimia, artesanía, iglesias, altares, dormir y sanatorios |
| `js/events.js` | fiestas, misiones con guion, castillo, ascenso social y servicios |
| `js/menu.js` | cuaderno de viaje: estado, mochila, relaciones, saber, diario, mapa, ecosistema, guardar y opciones |
| `js/creator.js` | creación de personaje |
| `js/data/` | PNJ (63), objetos, recetas, conjuros y tiendas |
| `audio/` | banda sonora en MP3 con sus puntos de bucle (`musica.json`); si falta, suena el secuenciador |
| `docs/` | biblia de diseño e investigación de folklore y ecología |
| `tools/` | arnés CDP para capturas y pruebas, galerías de arte y generador de especies |

## Pruebas

```sh
node tools/shot.mjs "quick=elfo,f" /tmp/a.png 'k:down*3' k:A w:500   # captura tras pulsar teclas
node tools/map.mjs ciudad bosque                                    # vuelca el mapa completo a /tmp/map_*.png
node tools/smoke.mjs                                                # recorre mapas, 60 días, PNJ y combates buscando excepciones
node tools/battle-test.mjs                                          # lleva diez combates completos hasta el final
CDP_PORT=9350 node tools/gal.mjs animals /tmp/g.png                 # captura una galería de arte (tools/gallery/*.html)
```
