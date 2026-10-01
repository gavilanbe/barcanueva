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
| Menú | Esc / C / Tab / Shift | MENÚ |

Para probar sin pasar por la creación: `?quick=tiefling,f&at=pradera,23,20&hour=21` (raza, sexo, mapa, x, y, hora).

## Estructura

| Archivo | Qué hace |
|---|---|
| `js/main.js` | arranque, título, bucle a 60 fps, escalado y ganchos de depuración (`window.__barca`) |
| `js/game.js` | mundo: mapas, cámara, entidades, horarios de NPCs, animales, tiempo, luz y HUD |
| `js/world.js` | construcción de mapas: ciudad, Monte del Juïc, 5 biomas e interiores generados |
| `js/tiles.js`, `js/buildings.js`, `js/chars.js`, `js/sprites.js` | todo el arte, pintado en código (tiles, edificios, personajes por capas, animales y muebles) |
| `js/font.js` | fuente de mapa de bits con tildes, ñ, ç y l·l |
| `js/ui.js` | diálogos, menús y dado d20 animado, todo por promesas (`await ui.say()`) |
| `js/state.js` | estado serializable, calendario, estadísticas, relaciones y guardado |
| `js/eco.js` | ecosistema vivo basado en individuos |
| `js/talk.js` | conversación: razas, relación, regalos, persuasión, romance, encargos y comercio |
| `js/battle.js` | combate por turnos con tiradas |
| `js/activities.js` | recolectar, pescar, cultivar, cazar, alquimia, artesanía, iglesias, altares, dormir y sanatorios |
| `js/events.js` | fiestas, misiones con guion, castillo, ascenso social y servicios |
| `js/menu.js` | menú de pausa |
| `js/creator.js` | creación de personaje |
| `js/data/` | NPCs (63), objetos, recetas, conjuros y tiendas |
| `docs/` | biblia de diseño e investigación de folklore y ecología |
| `tools/` | arnés CDP para capturas y pruebas (`shot.mjs`, `map.mjs`, `smoke.mjs`) y generador de especies |

## Pruebas

```sh
node tools/shot.mjs "quick=elfo,f" /tmp/a.png 'k:down*3' k:A w:500   # captura tras pulsar teclas
node tools/map.mjs ciudad bosque                                    # vuelca el mapa completo a /tmp/map_*.png
node tools/smoke.mjs                                                # recorre mapas, 60 días, NPCs y combates buscando excepciones
```
