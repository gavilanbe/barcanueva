# Barcanueva — Biblia de diseño

Simulador de vida + RPG en pixel art estilo Game Boy Advance (240×160, tiles de 16 px), para móvil y ordenador.
Ciudad de fantasía inspirada en Barcelona, desde la Barcino romana hasta el siglo XX, gobernada por el **Conde Barnabás**.

Documentos de apoyo:
- `investigacion-folklore.md`: 83 fichas de folklore, leyendas e historia con fuentes y propuesta de uso.
- `investigacion-ecologia.md` + `especies.json`: 160 especies por bioma con red trófica y modelo de ecosistema.

---

## 1. Tiempo

| Franja | Horas | Luz |
|---|---|---|
| Mañana | 06:00–10:00 | cálida |
| Día | 10:00–15:00 | neutra |
| Tarde | 15:00–19:00 | dorada |
| Crepúsculo | 19:00–21:00 | rosa, se encienden faroles y ventanas |
| Noche | 21:00–06:00 | azul; farolas, chimeneas y ventanas dan luz |

- **Días numerados** (`Día 17`), semanas de 7 días (domingo = misa) y año de 4 estaciones de 28 días.
- 1 segundo real = 1,5 minutos de juego (ajustable en Opciones: 1×, 1,5×, 3×). Un día dura unos 16 minutos.
- Si a las 02:30 no has dormido, te desplomas donde estés (y alguien te aligera la bolsa).

## 2. Personaje

**Creación:** sexo, raza, tono de piel (los tieflings tienen tonos propios), color de pelo, 8 peinados, barba, color de túnica y nombre (teclado en pantalla al estilo GBA o teclado físico). Luego se reparten **10 puntos básicos + 10 de sabiduría**.

| Raza | Trato | Mecánica |
|---|---|---|
| Humano | normal | — |
| Elfo | respeto y privilegio | +15 de relación inicial (+12 con nobles y elfófilos), frases de respeto, −5 % en precios, ventaja con los guardias del castillo, +4 PM |
| Tiefling | miedo u hostilidad en algunos | relación inicial −8, y hasta −32 con prejuiciosos, −14 con devotos y supersticiosos; +10 con tolerantes y +14 con marginados. La **capucha** oculta los cuernos a quien no te conoce (−1 CAR) |
| Enano | trato bueno, pero con burla | +8 de relación, frases burlonas o festivas hasta que la relación es alta, +6 PV |

**Estadísticas básicas:** FUERZA, INTELIGENCIA, DEFENSA, ESPÍRITU y CARISMA. **Sabiduría:** NATURALEZA, HISTORIA, ARCANO, ALQUIMIA, ARTESANÍA, CAZA Y PESCA y COMERCIO.
- Modificador de tirada = ⌊estadística / 2⌋ más las bonificaciones del equipo.
- **Toda acción da XP**: andar por zonas nuevas, hablar, recolectar, pescar, crear, leer, combatir, comerciar, rezar…
- Cada nivel da **+5 básicas y +5 de sabiduría** para repartir.
- **Aprender sin subir de nivel:** cada libro da +1 en su sabiduría. Los carteles, murales, lecciones de NPCs y otras experiencias dan ⅓, y tres tercios suman +1.
- **Equipo visible:** cabeza (barretina, sombrero, capucha, casco, yelmo de cuernos, diadema, cofia), cuerpo (túnica, jubón, cota, coraza, hábito, vestido, delantal) y capa. Todo cambia el sprite y algunas piezas dan bonificaciones.

**Tiradas d20 a lo D&D:** d20 + modificadores contra una CD, con animación de dado. Un 20 natural es crítico y un 1 natural es pifia. Se tira para persuadir, seducir, sonsacar secretos, calmar bestias, atacar, lanzar conjuros, alquimia, artesanía, pescar, buscar, huir, colarse en el castillo…

## 3. Mapas

- **Ciudad (intramuros, bioma urbano)**, 60×46:
  - Muralla con tres puertas: del Ángel (norte), Nuevo (este) y de Santa Madrona (oeste).
  - La Rambla con plátanos y la fuente de Canaletas.
  - Dos catedrales: **La Seu** (Santa Cruz y Santa Olaia; severa, sede del Tribunal) y **Santa María de la Mar** (benévola, la de los bastaixos).
  - Dos sanatorios: el **Hospital de la Santa Cruz** (rápido, caro y frío) y la **Convalecencia de San Pau** (lento, barato y enseña remedios).
  - Cuatro tabernas: La Oca Blanca, El Drac Borratxo, Los Cuatro Gatos y la Bodega de Canaletas.
  - Nueve tiendas especializadas: herboristería, ferrería, sastrería, librería, botica, horno, cerería, pescadería y alfarería.
  - El mercado de la Boquería, con vendedores al azar cada día y rarezas.
  - Consejo de Ciento, Veguería, Lonja de Mar (Taula de Canvi), Atarazanas, puerto con muelles y barcas, y casas (una en venta).
- **Monte del Juïc**: el **castillo del Conde**, el cementerio judío y la **cantera íbera** (el pasadizo secreto).
- **Extramuros**:

| Mapa | Bioma | Qué hay |
|---|---|---|
| Llano de Barcanueva | pradera | masías, molino, trigal, viña, olivar, huerto y la Piedra Larga (menhir) |
| Sierra de Collsaverola | bosque | la cabaña de la Vella, el guardabosques y un dolmen |
| Montseñal | montaña | ermita de Sant Medir, santuario de la Madre de las Cumbres y la cueva del oso |
| Riberas del Lobregat | río y lago | barraca del pescador, molino y la fuente de las Dones d'Aigua |
| Costa del Besós | costa | barracas de pescadores, templo de la Señora del Mar y cueva de contrabandistas |

## 4. NPCs (63)

Cada uno tiene nombre, raza, sexo, edad, aspecto, oficio, facción, hogar, horario por franja (y otro de domingo), rasgos, gustos y disgustos, biografía, rumores, **un secreto** y una **lección de saber**.
- **Ciudadanos** (con hogar): corte, iglesia, Consejo, guardia (cada guardia es único), tabernas, sanatorios, comercios, vecinos y extramuros.
- **Viajeros** (sin hogar): aparecen al azar según su frecuencia y franjas. Son Lluna (dona d'aigua), Guillem el Trovador, Perot Rocaguinarda, Micer Lanfranco, Constança la Peregrina, el Caballero de Negro, el Comte Arnau, Tamborí, Madrona la Endevina, Fra Pau y un templario.
- **Relación** de −100 a 100 con siete niveles (Enemistad… Íntimo).
- **Menú de conversación:**

| Opción | Qué hace |
|---|---|
| Charlar | una vez al día; frases según estación, franja, estado del ecosistema y personalidad |
| Preguntar | por su vida (Cordial o más), rumores, que te enseñe algo o un secreto (Amistad, o sonsacarlo con CAR) |
| Regalar | le gusta +14, neutro +5, no le gusta −10; la rosa en Sant Jordi, ×2 |
| Comerciar | en su puesto |
| Servicios | según el NPC |
| Pedir encargo | un recado con recompensa |
| Persuadir | rebaja, préstamo o chivatazo |
| Coquetear | romance: tras varios éxitos puedes declararte, y con anillo y casa, casarte |
| Provocar | insultar o pelear; en la ciudad llega la guardia y te multa |

- Los NPCs caminan por BFS a su puesto según la franja, entran y salen por puertas y bordes, y en fiestas se juntan en plazas.

## 5. Ecosistema vivo (`js/eco.js`)

Basado en individuos: cada animal tiene sexo, edad (cría o adulto) y hambre. Hay 40 especies de fauna visible (y peces, sólo pescables) repartidas por bioma, sacadas de la investigación.

**Tick diario:**
1. La vegetación se regenera y los herbívoros la consumen.
2. Los depredadores cazan presas **reales** del mapa, con saturación de Holling, dieta genérica de reserva y manada que comparte la presa grande.
3. La cría es estacional: cada hembra pare como mucho una vez por estación de cría, y hace falta un macho adulto.
4. Hay maduración, vejez, muerte por hambre y por hacinamiento, y **emigración** a mapas vecinos.
5. **Refugio**: los depredadores no pueden cazar a los últimos individuos de una presa. Así la naturaleza sola no las extingue, pero **tú sí**.
6. Extinción local y regional, con aviso. Las especies emblemáticas (oso, nutria, castor, esturión) no vuelven. Las comunes pueden llegar muy de tarde en tarde desde fuera de la comarca.

**Cascadas implementadas:**
- Sin lobos, suben los jabalíes y aumenta el **daño a cosechas**; aparecen el **simiot** y la **quarantamaula** de noche.
- Sin lechuzas, hay plaga de ratas y ratones.
- Sin abejas, la polinización cae y la alcachofa rinde menos.
- Sin doradas ni pulpos, los erizos se comen la **posidonia** y hay menos peces.
- La **dona d'aigua** sólo aparece si hay nutria y truchas.

En pantalla, los animales huyen, echan a volar, embisten o cazan de noche, y los depredadores visibles persiguen y se comen a presas visibles. Observar (NAT) revela especie, sexo, cría o adulto, dieta y cuántos hay. El menú Ecosistema muestra las poblaciones (con más precisión cuanta más NATURALEZA tengas).

## 6. Vida

- **Recolectar** (NAT) en hierba, bosque, matorral, juncal y playa, con recursos por bioma y estación. Ojo con la oronja verde.
- **Pescar** (caña + minijuego de picada + CAZA Y PESCA). La especie depende de la población real y pescar la reduce.
- **Cazar**: combate. El botín depende de la especie y de CAZA Y PESCA; NAT + CAZA amplían el rango de crítico contra bestias.
- **Domesticar**: calmar (NAT + CAR) y adoptar mascotas pequeñas que te siguen.
- **Cultivar** en la huerta que presta Agnès del Prat: sembrar, regar cada día y cosechar. Rinde menos con daño de jabalíes y ratones, y la alcachofa también con poca polinización.
- **Alquimia** en calderos: 9 recetas descubribles; las combinaciones fallidas enseñan ALQUIMIA. El «Rocío de San Juan» sólo sale la noche de Sant Joan.
- **Artesanía** en la forja o en tu mesa: 13 objetos.
- **Comprar casa** (800 d.): cama para dormir y guardar, arcón y mesa de trabajo. La pareja se muda contigo.
- **Sanatorios**: dos tratamientos distintos. Si caes derrotado despiertas en el Hospital días después.
- **Iglesias**: rezar, confesarse o dar limosna, bendición (tirada de ESPÍRITU) y agua bendita.
- **Altares paganos** (5): ofrendas, bendición de saber y conjuro de Calmar bestia con reputación pagana.
- **Tabernas**: alquilar cama o invitar a una ronda (+relación con todos los presentes).
- **Comercio**: los precios dependen de COMERCIO + CARISMA, la relación, la rebaja persuadida y la raza. También hay préstamos de la Taula de Canvi.

## 7. Ascenso social

**Rangos:** Forastero → Vecino (casa o reputación) → Ciudadano honrado → Prohombre (aval del gremio de Josep Puig) → Jurado del Consejo de Ciento (Fiveller) → **Caballero de la Corte** (el Conde).

**Reputaciones:** Ciudad, Seu, Santa María, Corte, Gremios y Cultos antiguos.

## 8. El castillo: «a no ser...»

El guardia Arnau de Sentmenat bloquea la puerta. Se entra de una de estas formas:
- Con la **carta del Consejo** (Fiveller).
- Con rango o reputación en la corte.
- **Persuadiendo** (CAR, con ventaja si eres elfo y desventaja si se ven tus cuernos).
- **Sobornando**.
- **A no ser...** por la **cantera íbera**: hay que conocer el rumor (Elies, Pelat, Marc, Bartomeu…) o descubrirla con HISTORIA. Sube a las bodegas y hay que pasar desapercibido.

Dentro te esperan el Conde (audiencia, tributo del vino, título), la Condesa (secreto pagano), el heredero rebelde y el **senescal conspirador**.

## 9. Misiones y leyendas jugables

| Misión | En qué consiste |
|---|---|
| La oca perdida | una de las 13 ocas de Santa Olaia anda suelta por el mercado |
| La «bruja» del Raval | desmontar el bulo contra Enriqueta (memoria frente a mito, inspirado en el caso real y en cómo la prensa fabricó la leyenda) |
| Jabalíes en el Llano | Joan Ferrer, ligada al ecosistema |
| Audiencia con el Conde | el tributo del vino |
| El senescal | secreto, denuncia o chantaje |
| El pacto del Monte del Te Daré | «Haec omnia tibi dabo»: riquezas, poder, saber o amor a cambio de tu sombra; sólo una vez por partida |
| El Comte Arnau | rosa bendecida en Santa María + Noche de Ánimas en la cumbre |
| La dona d'aigua | devolver su peine de oro (se lo pides a Andreu) y casarte con ella sin preguntarle nunca qué es |
| Encargos | recados según el oficio de cada NPC |

**Calendario (12 fiestas):** Sant Medir, Sant Jordi, Corpus (l'ou com balla), Revetlla de Sant Joan, Sant Martí, la Mercè, Castanyada y Noche de Ánimas, Santa Olaia, los Tres Tombs, Carnestoltes, el Tió y l'Home dels Nassos.

## 10. Combate

Por turnos, con tiradas de d20 y tres capas de habilidad:

- **Pulso.** En cada tirada, un anillo se cierra sobre el dado. Si pulsas A cuando lo abraza, sumas +1 fuera de combate o +2 en combate («¡pulso!»). Tres pulsos o paradas perfectas seguidos dan **racha** (+1 al ataque).
- **Paradas.** El rival se prepara, puede amagar y embiste. Pulsar justo antes del impacto **bloquea** (mitad de daño) o hace una **parada perfecta** (sin daño y con contraataque). Si pulsas demasiado pronto, es «precipitado» y no sirve. La ventana crece con DEFENSA, con el seny y con la **guardia**, y se estrecha con la rauxa. La llamarada del drac no admite parada perfecta.
- **Seny i rauxa.** Una balanza de −5 (seny) a +5 (rauxa):
  - Empujan a la rauxa: atacar, los conjuros de daño, recibir golpes sin parar y que te provoquen (amenaza, rugido, chillido, insulto).
  - Empujan al seny: la guardia, calmar, observar, curar y las paradas perfectas.
  - En rauxa haces más daño y es más fácil el crítico, pero te defiendes peor.
  - En seny paras mejor y aciertas más en todo lo que no es pegar, pero tus golpes pierden fuerza.
  - En cada extremo se desbloquea un golpe especial con MENÚ:
    - **¡Rauxa!**: tres golpes al ritmo; un marcador barre la barra y el centro es perfecto.
    - **Seny**: curación, ventaja en la próxima tirada, guardia y lectura completa del rival.
- **Intenciones.** Sobre el rival aparece su siguiente movimiento: golpe, golpe fuerte, carga (escarbar, acechar, preparar la puñalada, tomar aire), defensa, huida, robo, sombra (oculta las intenciones), cura… Para leerlas hace falta saber:
  - Bestias: NATURALEZA o CAZA 3.
  - Criaturas del folclore: ARCANO 4.
  - Personas: CARISMA 3 o HISTORIA 4.
  - Si no llegas, ves «?». Observar, las rondallas y el Seny lo revelan todo.
- **Acciones de folclore** según el rival:
  - Bestias: calmar, ofrecer comida de su dieta, observar (revela su punto débil) y espantar.
  - Bandolero: negociar, amenazar y nombrar a Perot Rocaguinarda.
  - Follet: encargarle una tarea imposible u ofrecerle una cinta.
  - Quarantamaula: teme el fuego.
  - Simiot: el agua bendita le quema.
  - Drac de Olorda: plegaria a Sant Jordi (mejor con una rosa); el frío le entumece.
- **Puesta en escena.**
  - Entrada: transición de persianas con un «!» y los combatientes que entran deslizándose.
  - Cámara: gira hacia quien actúa, con parallax por capas.
  - Golpes: embestidas, congelación de impacto, destello blanco, retroceso, números de daño y barras con «fantasma».
  - Efectos propios por conjuro y criatura, y clima del día también en el combate.
  - Final: el rival vencido se disuelve, suena una fanfarria y el botín aparece objeto a objeto. Al perder, la pantalla pierde el color.

## 11. Sensación de juego e interfaz

- **Mundo.**
  - Suelo pintado píxel a píxel, con bordes orgánicos y color según la estación.
  - Sombras proyectadas. Los árboles, faroles y tejados tapan a quien pasa por detrás, y la hierba alta tapa los pies.
  - Agua, hierbas, trigo y juncos animados por el viento.
  - Huellas en arena y nieve, polvo al correr, pasos con sonido según el terreno.
  - Humo de chimeneas, hojas, polen, luciérnagas, pétalos en Sant Jordi y fuegos artificiales en Sant Joan y la Mercè.
- **Clima diario** según la estación: sol, nubes (con sus sombras cruzando el mapa), lluvia, tormenta con rayos, niebla y nieve. La lluvia acelera la picada en la pesca.
- **Luz.** Tinte por franja. De noche, oscuridad con focos tramados, ventanas encendidas, faroles y chimeneas, y el farolillo del jugador.
- **Personas.**
  - Respiran, parpadean y reaccionan al verte con emoticonos según su actitud: respeto, miedo, burla, cariño…
  - Los marcadores de misión flotan sobre su cabeza.
  - Los animales huyen con un «!» y los pájaros echan a volar de verdad.
- **Interfaz.**
  - Ventanas que se abren y se cierran con animación.
  - Diálogos con voz por personaje, pausas en la puntuación, retrato con expresión, boca que habla y parpadeo, y códigos de color y efectos.
  - Menús con mano que señala y barra que se desliza.
  - Avisos con icono, cartel de lugar en pergamino, anuncios de nivel y de fiestas, y una pista «A …» delante de lo interactuable.
- **Cuaderno de viaje** (menú de pausa):
  - Ficha con retrato y estado con iconos.
  - Mochila en rejilla con iconos.
  - Relaciones con retrato, saber, reputación y diario.
  - Mapa del lugar y de la comarca, con lo no explorado en «???».
  - Ecosistema con los sprites de las especies.
- **Pesca en dos fases.** La picada a tiempo (con picadas falsas) y la lucha: mantener al pez dentro de la zona hasta llenar la barra. La dificultad depende de la especie y de CAZA Y PESCA.
- **Dormir.** Fundido lento y tarjeta del nuevo día (fecha, estación, clima y fiesta).

## 12. Pendiente

- Más escenas con guion: Corpus con gigantes, correfoc de la Mercè, el drac de Olorda como jefe, y la Víbria.
- Crisis no anuales: langosta, peste, piratas, bullanga.
- Arco maestro de la muralla: derribo, Ensanche y Gran Feria.
- Barco a Mallorca y otros destinos.
- El tesoro templario bajo el Juïc.
- Casas propias ampliables y más mascotas del hogar (follet, minairons, Tió).
- Retratos dibujados a mano para los NPC principales (ahora son procedurales, con expresiones).
- Música compuesta por zona.
